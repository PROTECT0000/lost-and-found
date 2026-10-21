import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_API_URL ?? ''

export const apiClient = axios.create({ baseURL: `${API_ORIGIN}/api` })

/** Images served through the API come back as root-relative paths; point them at the API origin. */
export const resolveAssetUrl = (url: string) => (url.startsWith('/') ? `${API_ORIGIN}${url}` : url)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}
