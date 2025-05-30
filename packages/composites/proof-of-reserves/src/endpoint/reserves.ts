import { Validator } from '@chainlink/ea-bootstrap'
import type { ExecuteWithConfig, InputParameters } from '@chainlink/ea-bootstrap'
import {
  adaptersV2 as indexerAdaptersV2,
  adaptersV3 as indexerAdaptersV3,
  runBalanceAdapter,
  ETHEREUM_CL_INDEXER,
} from '../utils/balance'
import {
  adaptersV2 as protocolAdaptersV2,
  adaptersV3 as protocolAdaptersV3,
  runProtocolAdapter,
} from '../utils/protocol'
import { runReduceAdapter } from '../utils/reduce'
import { getValidAddresses } from '../utils/addressValidator'
import { Config } from '../config'
import { extractDate } from '../utils/scheduledTrigger'

export const supportedEndpoints = ['reserves']

export type TInputParameters = {
  protocol: string
  protocolEndpoint?: string
  indexer: string
  indexerEndpoint?: string
  indexerParams?: Record<string, string>
  confirmations?: number
  addresses?: string[]
  disableAddressValidation?: boolean
  disableDuplicateAddressFiltering?: boolean
  description?: string
  startUTC?: string
  endUTC?: string
}

const inputParameters: InputParameters<TInputParameters> = {
  protocol: {
    required: true,
    type: 'string',
    description: 'The protocol external adapter to use',
    options: [
      ...protocolAdaptersV2.map(({ NAME }) => NAME.toLowerCase()),
      ...protocolAdaptersV2.map(({ NAME }) => NAME.toUpperCase()),
      ...protocolAdaptersV3.map(({ name }) => name.toLowerCase()),
      ...protocolAdaptersV3.map(({ name }) => name.toUpperCase()),
      'coinbase_prime_eth',
      'COINBASE_PRIME_ETH',
      'list',
      'LIST',
    ],
  },
  protocolEndpoint: {
    type: 'string',
    description: 'Optional endpoint for the protocol external adapter to use',
  },
  indexer: {
    required: true,
    type: 'string',
    description: 'The indexer external adapter to use',
    options: [
      ...indexerAdaptersV2.map(({ NAME }) => NAME.toLowerCase()),
      ...indexerAdaptersV2.map(({ NAME }) => NAME.toUpperCase()),
      ...indexerAdaptersV3.map(({ name }) => name.toLowerCase()),
      ...indexerAdaptersV3.map(({ name }) => name.toUpperCase()),
      ETHEREUM_CL_INDEXER,
    ],
  },
  indexerEndpoint: {
    type: 'string',
    description: 'Optional endpoint for the indexer external adapter to use',
  },
  indexerParams: {
    type: 'object',
    description: 'Additional param for indexer external adapter to use',
  },
  confirmations: {
    required: false,
    type: 'number',
    description:
      'The number of confirmations required for a transaction to be counted when getting an address balance',
    default: 6,
  },
  addresses: {
    required: false,
    type: 'array',
    description: 'An array of addresses to get the balance from, when `protocol` is set to `list`',
  },
  disableAddressValidation: {
    required: false,
    type: 'boolean',
    description: 'Gives the option to disable address validation before the balances are fetched.',
    default: false,
  },
  disableDuplicateAddressFiltering: {
    required: false,
    type: 'boolean',
    description:
      'Gives the option to disabled the filtering of duplicate addresses in a request. ' +
      'If this is set to `true` and a duplicate address is contained in the request, the balance of that address will be counted twice.',
    default: false,
  },
  description: {
    required: false,
    type: 'string',
    description: 'Optional human readable description on what this request is about',
  },
  startUTC: {
    required: false,
    type: 'string',
    description: 'start time for scheduleWindow in UTC [Format HHMM]',
  },
  endUTC: {
    required: false,
    type: 'string',
    description: 'end time for scheduleWindow in UTC [Format HHMM]',
  },
}
export const execute: ExecuteWithConfig<Config> = async (input, context, config) => {
  const validator = new Validator(input, inputParameters, config.options)

  const jobRunID = validator.validated.id
  const protocol = validator.validated.data.protocol.toUpperCase()
  const indexer = validator.validated.data.indexer.toUpperCase()
  // TODO: defaults fill as non-nullable
  const confirmations = validator.validated.data.confirmations as number

  // check schedule window
  if (validator.validated.data.startUTC && validator.validated.data.endUTC) {
    const startUTC = extractDate(validator.validated.data.startUTC)
    const endUTC = extractDate(validator.validated.data.endUTC)
    const currentUTC = new Date()

    if (currentUTC < startUTC || currentUTC > endUTC) {
      throw new Error(
        `Skipping request. Current UTC Hour: ${currentUTC} outside schedule window of start: ${startUTC} and end: ${endUTC}`,
      )
    }
  }

  // TODO: type input
  const protocolOutput = await runProtocolAdapter(
    jobRunID,
    context,
    protocol,
    input.data as any,
    config,
    validator.validated.data.protocolEndpoint,
  )

  const validatedAddresses = getValidAddresses(protocolOutput, validator)

  const balanceOutput = await runBalanceAdapter(
    indexer,
    context,
    confirmations,
    config,
    validatedAddresses,
    validator.validated.data.indexerEndpoint,
    validator.validated.data.indexerParams,
  )
  const reduceOutput = await runReduceAdapter(indexer, context, balanceOutput)
  reduceOutput.data.description = validator.validated.data.description
  return reduceOutput
}
