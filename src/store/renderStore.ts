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
  /**
   * Largest on-screen radius a single splat may cover, in pixels. One splat
   * stretched across the view costs a lot of fill. Capping it is the strongest
   * lever on splat performance.
   */
  splatMaxPixelRadius: number
  /**
   * Splats smaller than this are skipped. Raising it drops distant detail that
   * a visitor cannot see anyway.
   */
  splatMinPixelRadius: number
  /** Reduces detail away from the centre of view. 0 turns foveation off. */
  splatConeFoveate: number
}

const FIDELITY: Record<Fidelity, FidelitySettings> = {
  low: {
    // 1.5 keeps text sharp on a phone and renders about half the pixels of 2.
    pixelRatioCap: 1.5,
    scatterDensity: 0.4,
    // 1024 holds an edge across a wide hillside. 512 shows steps on long shadows.
    shadowMapSize: 1024,
    postProcessing: false,
    splatMaxPixelRadius: 48,
    splatMinPixelRadius: 1.5,
    splatConeFoveate: 0.5,
  },
  high: {
    pixelRatioCap: 2,
    scatterDensity: 1,
    shadowMapSize: 2048,
    postProcessing: true,
    splatMaxPixelRadius: 128,
    splatMinPixelRadius: 0.5,
    splatConeFoveate: 0,
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

/** Detected from the viewport. Re-checked on resize and rotation. */
function detectDevice(): Device {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.matchMedia('(max-width: 900px)').matches
  return coarsePointer || narrow ? 'mobile' : 'desktop'
}

/**
 * Lowers fidelity one step. Never raises it.
 *
 * PerformanceMonitor calls this when frames drop. It measures the real scene on
 * the real device, so no static rating is needed to guess the same thing.
 *
 * It does not raise fidelity again, because that makes the quality flicker: the
 * scene gets heavy, drops, recovers, then gets heavy again. One step down is enough.
 */
export function dropFidelity(): void {
  if (useRenderStore.getState().fidelity === 'low') return
  useRenderStore.setState({ fidelity: 'low', settings: FIDELITY.low })
}

/** Runs one time at app start, from main.tsx. */
export function initRender(): void {
  // Start from the device. Measurement lowers it later if the scene is too heavy.
  const device = detectDevice()
  const start: Fidelity = device === 'mobile' ? 'low' : 'high'
  useRenderStore.setState({ device, fidelity: start, settings: FIDELITY[start] })

  // device follows the window. fidelity does not.
  window.addEventListener('resize', () => {
    const next = detectDevice()
    if (next !== useRenderStore.getState().device) {
      useRenderStore.setState({ device: next })
    }
  })
}
