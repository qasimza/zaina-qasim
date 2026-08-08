import { getJson } from './client'

export interface HelloResponse {
  message: string
  time: string
}

export function getHello(signal?: AbortSignal): Promise<HelloResponse> {
  return getJson<HelloResponse>('/api/hello', signal)
}
