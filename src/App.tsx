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
      {/* Camera stands low on the path, looking up the slope toward the summit. */}
      <Canvas
        shadows
        camera={{ position: [2, 14, 60], fov: 50, near: 0.5, far: 400 }}
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
