import { expose, ServerInstance } from '@chainlink/external-adapter-framework'
import { Adapter } from '@chainlink/external-adapter-framework/adapter'
import { config } from './config'
import { fundingRate, price } from './endpoint'

export const adapter = new Adapter({
  defaultEndpoint: price.name,
  name: 'MOBULA_STATE',
  config,
  endpoints: [price, fundingRate],
})

export const server = (): Promise<ServerInstance | undefined> => expose(adapter)
