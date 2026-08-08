import { create } from 'zustand'
import { getHello } from '../api/hello'

interface AppState {
  apiStatus: string
}

export const useAppStore = create<AppState>(() => ({
  apiStatus: 'checking…',
}))

// Runs one time at app start (called from main.tsx), not from a component.
export function initApiStatus(): void {
  getHello()
    .then((data) => useAppStore.setState({ apiStatus: data.message }))
    .catch(() => useAppStore.setState({ apiStatus: 'unreachable' }))
}
