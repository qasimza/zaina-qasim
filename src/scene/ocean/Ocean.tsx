import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SEA_LEVEL } from '../heightField'
import { HORIZON_COLOUR } from '../sky/Sky'
import fragmentShader from './shaders/fragment.frag'
import vertexShader from './shaders/vertex.vert'

/**
 * Ocean surface.
 *
 * A flat plane, not simulated geometry. The movement lives entirely in the
 * shader: two crossing wave fields perturb the normal, which drives both the
 * sun glitter and how much sky reflects. That is cheap, because the cost is one
 * plane regardless of how detailed the water looks.
 */
interface Props {
  sunDirection: THREE.Vector3
  fogDensity: number
  size?: number
}

export default function Ocean({ sunDirection, fogDensity, size = 6000 }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color('#4d94a6') },
      uDeep: { value: new THREE.Color('#1f4e63') },
      uSkyColour: { value: new THREE.Color('#9fc4dd') },
      uSunColour: { value: new THREE.Color('#ffdcaa') },
      uSunDirection: { value: sunDirection.clone().normalize() },
      uFogColour: { value: HORIZON_COLOUR },
      uFogDensity: { value: fogDensity },
    }),
    [sunDirection, fogDensity],
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_LEVEL, -400]}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
