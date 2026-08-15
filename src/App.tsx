import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import { useAppStore } from './store/appStore'
import { dropFidelity, useRenderStore } from './store/renderStore'

export default function App() {
  const apiStatus = useAppStore((state) => state.apiStatus)
  const device = useRenderStore((state) => state.device)
  const fidelity = useRenderStore((state) => state.fidelity)
  const pixelRatioCap = useRenderStore((state) => state.settings.pixelRatioCap)

  return (
    <>
      {/*
        CameraRig sets the real position. The far plane must exceed the sky dome
        radius, or the dome falls outside the frustum and no sky is drawn.
      */}
      <Canvas
        shadows
        camera={{ position: [2, 14, 60], fov: 50, near: 0.5, far: 4000 }}
        dpr={[1, pixelRatioCap]}
      >
        <PerformanceMonitor onDecline={dropFidelity} flipflops={2} onFallback={dropFidelity}>
          <Scene />
        </PerformanceMonitor>
      </Canvas>
      <main className="overlay">
        <p>Zaina Qasim — under construction</p>
        <p className="api-status">api: {apiStatus}</p>
        <p className="api-status">
          {device} · {fidelity}
        </p>
      </main>
    </>
  )
}
