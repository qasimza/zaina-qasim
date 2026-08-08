import { Canvas } from '@react-three/fiber'
import SpinningCube from './scene/SpinningCube'
import { useAppStore } from './store/appStore'

export default function App() {
  const apiStatus = useAppStore((state) => state.apiStatus)

  return (
    <>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 2]} intensity={1.4} />
        <SpinningCube />
      </Canvas>
      <main className="overlay">
        <p>Zaina Qasim — under construction</p>
        <p className="api-status">api: {apiStatus}</p>
      </main>
    </>
  )
}
