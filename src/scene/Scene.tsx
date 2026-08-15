import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import CameraRig from './CameraRig'
import Terrain from './Terrain'
import { SUMMIT, terrainHeight } from './heightField'
import { useRenderStore } from '../store/renderStore'

/** Golden-hour sun, low and raking across the slope from the left. */
const SUN = new THREE.Vector3(-60, 45, 30)

export default function Scene() {
  const fidelity = useRenderStore((state) => state.fidelity)
  const segments = fidelity === 'low' ? 140 : 220

  return (
    <>
      {/* Warm low sun, plus a strong sky fill so shadowed slopes keep their colour. */}
      <hemisphereLight args={['#d6e6f5', '#9a8f63', 2]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={SUN.toArray()}
        intensity={2}
        color="#ffd9a0"
        castShadow
      />

      {/* Atmospheric haze. Distance fades to the sky colour, which sells depth. */}
      <fogExp2 attach="fog" args={['#e8dcc4', 0.0032]} />
      <color attach="background" args={['#e8dcc4']} />

      <Terrain segments={segments} />

      {/* Museum placeholder, sitting on the summit. */}
      <mesh position={[SUMMIT.x, terrainHeight(SUMMIT.x, SUMMIT.z) + 3, SUMMIT.z]} castShadow>
        <boxGeometry args={[10, 6, 8]} />
        <meshStandardMaterial color="#d8cbb4" roughness={0.9} />
      </mesh>

      <CameraRig />
      <OrbitControls target={[SUMMIT.x, terrainHeight(SUMMIT.x, SUMMIT.z), SUMMIT.z]} />
    </>
  )
}
