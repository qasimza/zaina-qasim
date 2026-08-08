import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

export default function SpinningCube() {
  const mesh = useRef<Mesh>(null!)

  useFrame((_, delta) => {
    mesh.current.rotation.x += delta * 0.5
    mesh.current.rotation.y += delta * 0.8
  })

  return (
    <mesh ref={mesh}>
      <boxGeometry />
      <meshStandardMaterial color="#7a8b5e" />
    </mesh>
  )
}
