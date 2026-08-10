import { getGPUTier } from 'detect-gpu'
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
  /** The GPU name, when detect-gpu reports one. For the dev readout. */
  gpu?: string
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

function setFidelity(fidelity: Fidelity, gpu?: string): void {
  useRenderStore.setState({ fidelity, settings: FIDELITY[fidelity], gpu })
}

/**
 * Lowers fidelity one step. Never raises it.
 * Raising it again causes the quality to flicker: the scene gets heavy, drops,
 * recovers, then gets heavy again. One downward step is enough.
 */
export function dropFidelity(): void {
  if (useRenderStore.getState().fidelity === 'low') return
  setFidelity('low', useRenderStore.getState().gpu)
}

/** Runs one time at app start, from main.tsx. */
export function initRender(): void {
  // Step 1, instant: guess fidelity from device, so the scene can start rendering.
  const device = detectDevice()
  const override = readOverride('fidelity', ['low', 'high'] as const)
  const guess: Fidelity = override ?? (device === 'mobile' ? 'low' : 'high')
  useRenderStore.setState({ device, fidelity: guess, settings: FIDELITY[guess] })

  // Step 2, async: replace the guess with the measured GPU tier.
  // An override skips this, so tests hold the fidelity they asked for.
  if (!override) {
    getGPUTier({ benchmarksURL: '/gpu-benchmarks' })
      .then((result) => {
        // Tier 0-1 means weak hardware or an unknown GPU. Tier 2-3 runs the full scene.
        setFidelity(result.tier >= 2 ? 'high' : 'low', result.gpu)
      })
      .catch(() => {
        // The check failed. Keep the guess.
      })
  }

  // device follows the window. fidelity does not.
  window.addEventListener('resize', () => {
    const next = detectDevice()
    if (next !== useRenderStore.getState().device) {
      useRenderStore.setState({ device: next })
    }
  })
}
