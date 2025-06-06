import type BigNumber from 'bignumber.js'
import {
  addressData,
  mockCollateralEthMap,
  mockEthBalanceMap,
  mockFinalityCheckpoint,
  mockGetEthDepositContract,
  mockGetGenesisBlockInfo,
  mockGetValidatorStates,
  mockOperatorFeePercentMap,
  mockPenaltyMap,
  mockProtocolFeePercentMap,
} from './fixture'
import {
  TestAdapter,
  setEnvVariables,
} from '@chainlink/external-adapter-framework/util/testing-utils'
import { deferredPromise, sleep } from '@chainlink/external-adapter-framework/util'
import * as nock from 'nock'

type TotalPenaltyAmountCall = {
  resolve: () => void
  promise: Promise<BigNumber>
}

const totalPenaltyAmountCalls: Record<string, TotalPenaltyAmountCall> = {}

const getTotalPenaltyAmount = (address: string) => {
  if (!(address in totalPenaltyAmountCalls)) {
    const [promise, resolve] = deferredPromise<BigNumber>()
    totalPenaltyAmountCalls[address] = {
      resolve: () => resolve(mockPenaltyMap[address]),
      promise,
    }
  }
  return totalPenaltyAmountCalls[address].promise
}

jest.mock('ethers', () => {
  const actualModule = jest.requireActual('ethers')
  return {
    ...actualModule,
    ethers: {
      ...actualModule.ethers,
      providers: {
        JsonRpcProvider: function () {
          return {
            getBlockNumber: jest.fn().mockReturnValue(10000),
            getBalance: jest.fn().mockImplementation((address) => {
              return mockEthBalanceMap[address]
            }),
            getBlock: jest.fn().mockImplementation(() => {
              return { timestamp: new Date('2022-08-01T07:14:54.909Z').getTime() / 1000 }
            }),
            getLogs: jest.fn().mockImplementation(() => {
              return [
                {
                  blockNumber: 9000,
                  blockHash: '0xe5a4ff6958f847e5ae8757fe62b023dc16e5a53776064b79659e41de9491a14d',
                  transactionIndex: 18,
                  removed: false,
                  address: '0x8c5fecdC472E27Bc447696F431E425D02dd46a8c',
                  data:
                    '0x00000000000000000000000000000000000000000000000000000000000000a000000000000' +
                    '00000000000000000000000000000000000000000000000000100000000000000000000000000' +
                    '00000000000000000000000000000000000001400000000000000000000000000000000000000' +
                    '00000000000000000000000018000000000000000000000000000000000000000000000000000' +
                    '00000000000200000000000000000000000000000000000000000000000000000000000000003' +
                    '098416f837d457d72f0dd5297898e1225a1e7731c2579f642626fbdc8ee8ce4f1e89ca538b72d' +
                    '5c3b75fdd1e9e10c87c6000000000000000000000000000000000000000000000000000000000' +
                    '00000000000000000000000000000000000002000000000000000000000000000000000000000' +
                    '00000000000000000000000000000000000000000000000000000000000000000000000000000' +
                    '000000000000800ca9a3b00000000000000000000000000000000000000000000000000000000' +
                    '00000000000000000000000000000000000000000000000000000000000000600000000000000' +
                    '00000000000000000000000000000000000000000000000000000000000000000000000000000' +
                    '00000000000000000000000000000000000000000000000000000000000000000000000000000' +
                    '00000000000000000000000000000000000000000000000000000000000000000000000000000' +
                    '0000000000089718040000000000000000000000000000000000000000000000000000000000',
                  topics: ['0x649bbc62d0e31342afea4e5cd82d4049e7e1ee912fc0889aa790803be39038c5'],
                  transactionHash:
                    '0xb562350898581dfa4318404319c36989ae4b9bce4f35dda4f0c5469b659d15a1',
                  logIndex: 10,
                },
                {
                  blockNumber: 8766192,
                  blockHash: '0xf5f8f9961e5bfca372cfebfd113ccde61f44c51f971a45ef511c4a3173df8c35',
                  transactionIndex: 81,
                  removed: false,
                  address: '0x8c5fecdC472E27Bc447696F431E425D02dd46a8c',
                  data:
                    '0x00000000000000000000000000000000000000000000000000000000000000a000000000000' +
                    '00000000000000000000000000000000000000000000000000100000000000000000000000000' +
                    '00000000000000000000000000000000000001400000000000000000000000000000000000000' +
                    '00000000000000000000000018000000000000000000000000000000000000000000000000000' +
                    '00000000000200000000000000000000000000000000000000000000000000000000000000003' +
                    '08af03fc3ba342b625c868325386fd421fa677d87cf96d528f4649cf043ea33b8f1466dd6bce6' +
                    '6b0c9d949b8b65d1549c000000000000000000000000000000000000000000000000000000000' +
                    '0000000000000000000000000000000000000200100000000000000000000008989859156070a' +
                    '1bc64f8833dbbc19dc1bd1a2b8000000000000000000000000000000000000000000000000000' +
                    '00000000000080076be3707000000000000000000000000000000000000000000000000000000' +
                    '00000000000000000000000000000000000000000000000000000000000000608290baa59acd3' +
                    'df31995518b5850310ad8b6069b6411e5953ce184e3024f8a205f4aaec26b9e928499da1fa733' +
                    '96b6db10e9ded1e3d276e4c3977a3e06319286fdb255553c735dddc11760c932ce43bf1e17d3a' +
                    'd1a5e142576611d345862c1850000000000000000000000000000000000000000000000000000' +
                    '0000000000086219040000000000000000000000000000000000000000000000000000000000',
                  topics: ['0x649bbc62d0e31342afea4e5cd82d4049e7e1ee912fc0889aa790803be39038c5'],
                  transactionHash:
                    '0x9929c0eb8a7e1e5c3c8016272af4c0900acabaac9c843f7c6b4f6c8e3c15a746',
                  logIndex: 161,
                },
              ]
            }),
          }
        },
      },
      Contract: function () {
        return {
          getProtocolFee: jest.fn().mockImplementation((poolId) => {
            return mockProtocolFeePercentMap[poolId]
          }),
          getOperatorFee: jest.fn().mockImplementation((poolId) => {
            return mockOperatorFeePercentMap[poolId]
          }),
          totalPenaltyAmount: jest.fn().mockImplementation(getTotalPenaltyAmount),
          getStakedEthPerNode: jest.fn().mockReturnValue(32_000_000_000_000_000_000),
          getCollateralETH: jest.fn().mockImplementation((poolId) => {
            return mockCollateralEthMap[poolId]
          }),
          getPenaltyContract: jest
            .fn()
            .mockReturnValue('0x0FB2921fb8ad8C5364a8156693E2D94135d07e02'),
          getPermissionedPool: jest
            .fn()
            .mockReturnValue('0xEc4166439523e8C2FaE395201f04876Cc7C02d68'),
          getPoolUtils: jest.fn().mockReturnValue('0x019a7ced1927946eADb28735f15a20e3ed762240'),
          getStakePoolManager: jest
            .fn()
            .mockReturnValue('0x974Db4Fb26993289CAD9f79Bde4eAE097503064f'),
          getPoolIdArray: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
          totalOperatorETHRewardsRemaining: jest.fn().mockReturnValue(100_000_000_000_000_000),
          getStaderOracle: jest.fn().mockReturnValue('0xAAe724e44766aC7ccaA6f6aA95c8B1659F5FB44D'),
          getETHxToken: jest.fn().mockReturnValue('0xbB83c4735D8c317e058F59289C6CD26da0D121FD'),
          getERReportableBlock: jest.fn().mockReturnValue(8000),
          totalSupply: jest.fn().mockReturnValue(786_000_000_000_000_000_000),
        }
      },
    },
  }
})

describe('Stader Balance', () => {
  let spy: jest.SpyInstance
  let testAdapter: TestAdapter
  let oldEnv: NodeJS.ProcessEnv

  beforeAll(async () => {
    mockGetGenesisBlockInfo()
    mockGetEthDepositContract()
    mockGetValidatorStates()
    mockFinalityCheckpoint()
    oldEnv = JSON.parse(JSON.stringify(process.env))
    process.env['ETHEREUM_RPC_URL'] = 'http://localhost:9091'
    process.env['BEACON_RPC_URL'] = 'http://localhost:9092'
    process.env['BACKGROUND_EXECUTE_MS'] = '0'
    process.env['GROUP_SIZE'] = '2'
    const mockDate = new Date('2022-08-01T07:14:54.909Z')
    spy = jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime())

    const adapter = (await import('./../../src')).adapter
    adapter.rateLimiting = undefined
    testAdapter = await TestAdapter.startWithMockedCache(adapter, {
      testAdapter: {} as TestAdapter<never>,
    })
  })

  afterAll(async () => {
    setEnvVariables(oldEnv)
    await testAdapter.api.close()
    nock.restore()
    nock.cleanAll()
    spy.mockRestore()
  })

  describe('balance endpoint', () => {
    it('should return success', async () => {
      const responsePromise = testAdapter.request(addressData.data)
      // We have 3 withdrawn validators and 4 active validators.
      // So with a group size of 2, we expect first 2 + 1 calls for the
      // withdrawn validators followed by 2 + 2 calls for the active
      // validators.

      await sleep(50)
      expect(Object.keys(totalPenaltyAmountCalls)).toHaveLength(2)
      Object.values(totalPenaltyAmountCalls).forEach((call) => call.resolve())

      await sleep(50)
      expect(Object.keys(totalPenaltyAmountCalls)).toHaveLength(3)
      Object.values(totalPenaltyAmountCalls).forEach((call) => call.resolve())

      await sleep(50)
      expect(Object.keys(totalPenaltyAmountCalls)).toHaveLength(5)
      Object.values(totalPenaltyAmountCalls).forEach((call) => call.resolve())

      await sleep(50)
      expect(Object.keys(totalPenaltyAmountCalls)).toHaveLength(7)
      Object.values(totalPenaltyAmountCalls).forEach((call) => call.resolve())

      const response = await responsePromise
      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchSnapshot()
    })

    it('should return error (empty data)', async () => {
      const response = await testAdapter.request({})
      expect(response.statusCode).toBe(400)
    })
  })

  describe('total supply endpoint', () => {
    it('should return success', async () => {
      const data = {
        endpoint: 'totalSupply',
        chainId: 'goerli',
      }
      const response = await testAdapter.request(data)
      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchSnapshot()
    })
  })
})
