import { GroupRunner } from '@chainlink/external-adapter-framework/util/group-runner'
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import {
  BalanceResponse,
  DEPOSIT_EVENT_LOOKBACK_WINDOW,
  DEPOSIT_EVENT_TOPIC,
  fetchAddressBalance,
  fetchEthDepositContractAddress,
  formatValueInGwei,
  getBeaconGenesisTimestamp,
  ONE_ETH_WEI,
  parseLittleEndian,
  RequestParams,
  THIRTY_ONE_ETH_WEI,
  ValidatorAddress,
  withErrorHandling,
} from './utils'
import { config } from '../config'
import { StaderConfig } from './utils/stader-config'
import { PermissionedPool } from './utils/permissioned-pool'
import { StakeManager } from './utils/stake-manager'
import { Pool } from './utils/pool'
import { ValidatorFactory, type ActiveValidator, type WithdrawnValidator } from './utils/validator'
import { DepositEvent_ABI, StaderPenaltyContract_ABI } from '../config/StaderContractAbis'
import { SubscriptionTransport } from '@chainlink/external-adapter-framework/transports/abstract/subscription'
import { TransportDependencies } from '@chainlink/external-adapter-framework/transports'
import { EndpointContext } from '@chainlink/external-adapter-framework/adapter'
import {
  AdapterResponse,
  makeLogger,
  sleep,
  splitArrayIntoChunks,
} from '@chainlink/external-adapter-framework/util'
import { BaseEndpointTypes } from '../endpoint/balance'

const logger = makeLogger('StaderBalanceLogger')
export class BalanceTransport extends SubscriptionTransport<BaseEndpointTypes> {
  provider!: ethers.providers.JsonRpcProvider
  genesisTimestampInSec!: number

  async initialize(
    dependencies: TransportDependencies<BaseEndpointTypes>,
    adapterSettings: typeof config.settings,
    endpointName: string,
    transportName: string,
  ): Promise<void> {
    await super.initialize(dependencies, adapterSettings, endpointName, transportName)
    this.provider = new ethers.providers.JsonRpcProvider(
      adapterSettings.ETHEREUM_RPC_URL,
      adapterSettings.CHAIN_ID,
    )
    this.genesisTimestampInSec = await getBeaconGenesisTimestamp(adapterSettings.BEACON_RPC_URL)
  }

  getSubscriptionTtlFromConfig(adapterSettings: typeof config.settings): number {
    return adapterSettings.WARMUP_SUBSCRIPTION_TTL
  }

  async backgroundHandler(
    context: EndpointContext<BaseEndpointTypes>,
    entries: RequestParams[],
  ): Promise<void> {
    await Promise.all(entries.map(async (req) => this.handleRequest(req, context)))
    await sleep(context.adapterSettings.BACKGROUND_EXECUTE_MS)
  }

  async handleRequest(
    req: RequestParams,
    context: EndpointContext<BaseEndpointTypes>,
  ): Promise<void> {
    let response: AdapterResponse<BaseEndpointTypes['Response']>
    try {
      response = await this._handleRequest(req, context)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      response = {
        statusCode: 502,
        errorMessage,
        timestamps: {
          providerDataRequestedUnixMs: 0,
          providerDataReceivedUnixMs: 0,
          providerIndicatedTimeUnixMs: undefined,
        },
      }
    }
    await this.responseCache.write(this.name, [{ params: req, response }])
  }

  async _handleRequest(
    req: RequestParams,
    context: EndpointContext<BaseEndpointTypes>,
  ): Promise<AdapterResponse<BaseEndpointTypes['Response']>> {
    // We're making a lot of requests in this complex logic, so we start counting the time
    // it takes for the provider to reply from here, accounting for all requests involved
    const providerDataRequestedUnixMs = Date.now()

    // Use reported block number retrieved from Stader as the block tag
    const blockTag = req.reportedBlock

    // Fetch addresses for all relevant contracts from the StaderConfig contract
    // Override with addresses from request, if exist
    const staderConfig = new StaderConfig(req, blockTag, this.provider)
    const { poolFactoryAddress, penaltyAddress, stakeManagerAddress, permissionedPoolAddress } =
      await staderConfig.fetchContractAddresses(req, blockTag)

    // Create necessary basic constructs
    const permissionedPool = new PermissionedPool(permissionedPoolAddress, blockTag, this.provider)
    const stakeManager = new StakeManager(stakeManagerAddress, blockTag, this.provider)
    const { socialPools, poolMap } = await Pool.buildAll(
      { ...req, poolFactoryAddress },
      blockTag,
      this.provider,
    )

    // Fetch as much data in parallel as we can
    // Max concurrent calls = (batched validator states * settings.GROUP_SIZE) + (EL reward address balance * $batchSize) + 4 single reqs
    const [
      ethDepositContractAddress,
      permissionedPoolBalance,
      stakeManagerBalance,
      validatorDeposit,
      elRewardBalances,
      { activeValidators, withdrawnValidators, limboAddressMap, depositedAddressMap },
    ] = await Promise.all([
      // --- Requests to the execution node ---

      // Get the address for the main ETH deposit contract
      fetchEthDepositContractAddress(context.adapterSettings), // 1X

      // Fetch the balance for the permissioned pool
      permissionedPool.fetchBalance(), // 1X

      // Fetch the balance for the stake manager
      stakeManager.fetchBalance(), // 1X

      // Fetch the validator deposit value in the stader config
      staderConfig.fetchValidatorDeposit(), // 1X

      // Get all the execution layer rewards for the specified addresses in the request
      this.getElRewardBalances(req, blockTag, context.adapterSettings), // 1X per elRewardAddresses, sent in parallel bursts of $batchSize

      // --- Requests to the Beacon node ---

      // Fetch all validators specified in the request addresses from the beacon chain
      ValidatorFactory.fetchAll({
        ...req,
        poolMap,
        blockTag,
        penaltyContract: this.buildPenaltyContract(penaltyAddress),
        settings: context.adapterSettings,
        provider: this.provider,
        genesisTimestampInSec: this.genesisTimestampInSec,
      }),
    ])

    // Get permissionless/permissioned pool address balances
    // This will also cache values in the pools that the validators will be able to reuse
    // Should not be a problem to send all requests concurrently, as the # of pools should be in the low 10s
    const poolAddressBalances = await Promise.all(
      socialPools.map((p) => p.fetchBalance(validatorDeposit)),
    )

    // Get balances for all validator addresses in limbo and deposited addresses
    const { limboBalances, depositedBalanceMap } = await this.calculateLimboEthBalances({
      limboAddressMap,
      depositedAddressMap,
      ethDepositContractAddress,
      blockTag,
    })

    const validatorBalances = []

    const calculateWithdrawnBalanceInGroups = new GroupRunner(
      context.adapterSettings.GROUP_SIZE,
    ).wrapFunction((v: WithdrawnValidator) => v.calculateBalance(validatorDeposit))

    // Perform active validator calculations
    // These will need a call to get the penalty rate for each of them, so we have to batch these
    validatorBalances.push(
      ...(await Promise.all(withdrawnValidators.map((v) => calculateWithdrawnBalanceInGroups(v)))),
    )

    const calculateActiveBalanceInGroups = new GroupRunner(
      context.adapterSettings.GROUP_SIZE,
    ).wrapFunction((v: ActiveValidator) =>
      v.calculateBalance(validatorDeposit, depositedBalanceMap[v.addressData.address]),
    )

    // Perform active validator calculations
    // These will need a call to get the penalty rate for each of them, so we have to batch these
    validatorBalances.push(
      ...(await Promise.all(activeValidators.map((v) => calculateActiveBalanceInGroups(v)))),
    )

    // Flatten all the balances out, they'll be aggregated in the proof-of-reserves EA
    const balances = [
      stakeManagerBalance,
      elRewardBalances,
      permissionedPoolBalance,
      validatorBalances,
      poolAddressBalances,
      limboBalances,
    ].flat()

    return {
      data: {
        result: balances,
      },
      result: null,
      statusCode: 200,
      timestamps: {
        providerDataRequestedUnixMs,
        providerDataReceivedUnixMs: Date.now(),
        providerIndicatedTimeUnixMs: undefined,
      },
    }
  }

  private buildPenaltyContract(penaltyAddress: string) {
    return new ethers.Contract(penaltyAddress, StaderPenaltyContract_ABI, this.provider)
  }

  // Get balance of all execution layer reward addresses (in wei)
  async getElRewardBalances(
    req: RequestParams,
    blockTag: number,
    settings: typeof config.settings,
  ): Promise<BalanceResponse[]> {
    const balances: BalanceResponse[] = []
    const elRewardAddresses = (req.elRewardAddresses as { address: string }[]).map(
      ({ address }) => address,
    )
    const groupedBatches = splitArrayIntoChunks(elRewardAddresses, settings.GROUP_SIZE)

    return withErrorHandling('Retrieving validator execution layer reward balances', async () => {
      for (const group of groupedBatches) {
        await Promise.all(
          group.map(async (address) => {
            const balance = await fetchAddressBalance(address, blockTag, this.provider)
            balances.push({ address, balance: formatValueInGwei(balance) })
          }),
        )
      }

      return balances
    })
  }

  // Get event logs to find deposit events for addresses not on the beacon chain yet
  // Returns deposit amount in wei
  async calculateLimboEthBalances({
    limboAddressMap = {},
    depositedAddressMap = {},
    ethDepositContractAddress,
    blockTag,
  }: {
    limboAddressMap: Record<string, ValidatorAddress>
    depositedAddressMap: Record<string, ValidatorAddress>
    ethDepositContractAddress: string
    blockTag: number
  }): Promise<{
    limboBalances: BalanceResponse[]
    depositedBalanceMap: Record<string, BigNumber>
  }> {
    return withErrorHandling(
      `Finding ETH for limbo validators and deposited addresses`,
      async () => {
        let limboBalances: BalanceResponse[] = []
        const depositedBalanceMap: Record<string, BigNumber> = {}

        // Skip fetching logs if no addresses in limbo to search for
        if (
          Object.entries(limboAddressMap).length === 0 &&
          Object.entries(depositedAddressMap).length === 0
        ) {
          return { limboBalances, depositedBalanceMap }
        }

        // Get all the deposit logs from the last DEPOSIT_EVENT_LOOKBACK_WINDOW blocks
        const logs = await this.provider.getLogs({
          address: ethDepositContractAddress,
          topics: [DEPOSIT_EVENT_TOPIC],
          fromBlock: blockTag - DEPOSIT_EVENT_LOOKBACK_WINDOW,
          toBlock: blockTag,
        })

        if (logs.length === 0) {
          logger.debug(
            `No deposit event logs found in the last ${DEPOSIT_EVENT_LOOKBACK_WINDOW} blocks or the provider failed to return any.`,
          )
          // We're returning this so the EA has an explicit answer for the address balance
          limboBalances = Object.entries(limboAddressMap).map(([address, _]) => ({
            address,
            balance: '0',
          }))
          return { limboBalances, depositedBalanceMap }
        }

        logger.debug(
          `Found ${logs.length} deposit events in the last ${DEPOSIT_EVENT_LOOKBACK_WINDOW} blocks`,
        )

        // Parse the fetched logs with the deposit event interface
        const depositEventInterface = new ethers.utils.Interface(DepositEvent_ABI)
        const parsedlogs = logs
          .map((l) => depositEventInterface.parseLog(l))
          .map((l) => ({
            address: l.args[0],
            amount: parseLittleEndian(l.args[2].toString()),
          }))

        for (const { address, amount } of parsedlogs) {
          // Limbo addresses are ones where the first 1 eth was sent from Stader but has not reached the beacon chain yet
          if (limboAddressMap[address]) {
            if (amount.eq(ONE_ETH_WEI)) {
              logger.debug(`Found 1 ETH deposit event for validator ${address}`)
              limboBalances.push({
                address,
                balance: formatValueInGwei(amount),
              })
            } else {
              logger.warn(
                `Unexpected balance amount ${amount} (in wei) found for limbo address ${address}, expected ${ONE_ETH_WEI}`,
              )
            }
          }
          // Deposited addresses are ones where the first eth has reached the beacon chain, but the second 31eth deposit hasn't
          if (depositedAddressMap[address]) {
            if (amount.eq(THIRTY_ONE_ETH_WEI)) {
              logger.debug(`Found 31 ETH deposit event for deposited validator ${address}`)
              depositedBalanceMap[address] = amount
            } else if (amount.eq(ONE_ETH_WEI)) {
              logger.debug(
                `Found initial 1 ETH deposit for address ${address}, but it should already be accounted in the main validators list`,
              )
            } else {
              logger.warn(
                `Unexpected balance amount ${amount} (in wei) found for deposited address ${address}, expected ${THIRTY_ONE_ETH_WEI}`,
              )
            }
          }
        }

        return { limboBalances, depositedBalanceMap }
      },
    )
  }
}

export const transport = new BalanceTransport()
