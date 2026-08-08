import { Canvas } from '@react-three/fiber'
import SpinningCube from './scene/SpinningCube'

export default function App() {
  return (
    <>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 2]} intensity={1.4} />
        <SpinningCube />
      </Canvas>
      <main className="overlay">Zaina Qasim — under construction</main>
    </>
  )
}
