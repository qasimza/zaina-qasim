import { create } from 'zustand'

/** What the visitor is using. Decides composition, not cost. */
export type Device = 'mobile' | 'desktop'

/** How expensive the render is. Starts from device, lowers for weak hardware. */
export type Fidelity = 'low' | 'high'

export interface FidelitySettings {
  /** Upper limit for canvas pixel ratio. Caps the fragment cost on dense screens. */
  pixelRatioCap: number
  /** Multiplier for every instanced scatter count: grass, rocks, flowers, trees. */
  scatterDensity: number
  /** Shadow map size in pixels. 0 turns shadows off. */
  shadowMapSize: number
  /** Whether post-processing passes run. */
  postProcessing: boolean
}

const FIDELITY: Record<Fidelity, FidelitySettings> = {
  low: {
    pixelRatioCap: 2,
    scatterDensity: 0.4,
    shadowMapSize: 512,
    postProcessing: false,
  },
  high: {
    pixelRatioCap: 2,
    scatterDensity: 1,
    shadowMapSize: 1024,
    postProcessing: true,
  },
}

interface RenderState {
  device: Device
  fidelity: Fidelity
  settings: FidelitySettings
}

export const useRenderStore = create<RenderState>(() => ({
  device: 'desktop',
  fidelity: 'high',
  settings: FIDELITY.high,
}))

function readOverride<T extends string>(key: string, allowed: readonly T[]): T | null {
  const value = new URLSearchParams(window.location.search).get(key)
  return allowed.includes(value as T) ? (value as T) : null
}

/** Detected from the viewport. Re-checked on resize and rotation. */
function detectDevice(): Device {
  const override = readOverride('device', ['mobile', 'desktop'] as const)
  if (override) return override

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.matchMedia('(max-width: 900px)').matches
  return coarsePointer || narrow ? 'mobile' : 'desktop'
}

/**
 * Lowers fidelity one step. Never raises it.
 *
 * PerformanceMonitor calls this when frames drop. It measures the real scene on
 * the real device, so no static GPU database is needed to guess the same thing.
 *
 * It does not raise fidelity again, because that makes the quality flicker: the
 * scene gets heavy, drops, recovers, then gets heavy again. One step down is enough.
 */
export function dropFidelity(): void {
  if (useRenderStore.getState().fidelity === 'low') return
  if (readOverride('fidelity', ['low', 'high'] as const)) return
  useRenderStore.setState({ fidelity: 'low', settings: FIDELITY.low })
}

/** Runs one time at app start, from main.tsx. */
export function initRender(): void {
  // Start from the device. Measurement corrects it within the first seconds.
  const device = detectDevice()
  const override = readOverride('fidelity', ['low', 'high'] as const)
  const start: Fidelity = override ?? (device === 'mobile' ? 'low' : 'high')
  useRenderStore.setState({ device, fidelity: start, settings: FIDELITY[start] })

  // device follows the window. fidelity does not.
  window.addEventListener('resize', () => {
    const next = detectDevice()
    if (next !== useRenderStore.getState().device) {
      useRenderStore.setState({ device: next })
    }
  })
}
