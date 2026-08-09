import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import { useAppStore } from './store/appStore'

export default function App() {
  const apiStatus = useAppStore((state) => state.apiStatus)

  return (
    <>
      <Canvas camera={{ position: [0, 1.5, 8], fov: 55 }}>
        <Scene />
      </Canvas>
      <main className="overlay">
        <p>Zaina Qasim — under construction</p>
        <p className="api-status">api: {apiStatus}</p>
      </main>
    </>
  )
}
