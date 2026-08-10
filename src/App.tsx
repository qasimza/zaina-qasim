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
      {/* Spark asks for antialias: false. WebGL AA does not help splats and costs a lot. */}
      <Canvas
        camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 1000 }}
        dpr={[1, pixelRatioCap]}
        gl={{ antialias: false }}
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
