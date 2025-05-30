import { expose, ServerInstance } from '@chainlink/external-adapter-framework'
import { Adapter } from '@chainlink/external-adapter-framework/adapter'
import { config } from './config'
import { aptosDfReaderEndpoint, aptosEndpoint, functionEndpoint } from './endpoint'

export const adapter = new Adapter({
  defaultEndpoint: functionEndpoint.name,
  name: 'VIEW_FUNCTION_MULTI_CHAIN',
  config,
  endpoints: [functionEndpoint, aptosEndpoint, aptosDfReaderEndpoint],
  rateLimiting: {
    tiers: {
      default: {
        rateLimit1s: 1,
        note: 'Reasonable limits',
      },
    },
  },
})

export const server = (): Promise<ServerInstance | undefined> => expose(adapter)
