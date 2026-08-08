import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { getHello } from './api/hello'
import SpinningCube from './scene/SpinningCube'

export default function App() {
  const [apiStatus, setApiStatus] = useState('checking…')

  useEffect(() => {
    const ctrl = new AbortController()
    getHello(ctrl.signal)
      .then((data) => setApiStatus(data.message))
      .catch(() => {
        if (!ctrl.signal.aborted) setApiStatus('unreachable')
      })
    return () => ctrl.abort()
  }, [])

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
