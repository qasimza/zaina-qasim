import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import CameraRig from './CameraRig'
import Sky, { HORIZON_COLOUR } from './Sky'
import Terrain from './Terrain'
import { SUMMIT, VIEWPOINT, terrainHeight } from './heightField'
import { useRenderStore } from '../store/renderStore'

/** Low sun, raking across the peaks from the left. */
const SUN = new THREE.Vector3(-180, 90, 60)

export default function Scene() {
  const fidelity = useRenderStore((state) => state.fidelity)
  const segments = fidelity === 'low' ? 240 : 400

  return (
    <>
      <Sky sunDirection={SUN} />

      {/* Cool sky fill plus warm sun, so shadowed faces keep colour. */}
      <hemisphereLight args={['#bcd4ea', '#6d6550', 1.4]} />
      <directionalLight position={SUN.toArray()} intensity={2.2} color="#ffdcaa" />

      {/* Fog matches the sky horizon, so distant peaks dissolve into it. */}
      <fogExp2 attach="fog" args={[HORIZON_COLOUR.getHex(), 0.0016]} />

      <Terrain segments={segments} />

      {/* Museum placeholder on its summit. */}
      <mesh position={[SUMMIT.x, terrainHeight(SUMMIT.x, SUMMIT.z) + 6, SUMMIT.z]}>
        <boxGeometry args={[26, 12, 20]} />
        <meshStandardMaterial color="#d8cbb4" roughness={0.9} />
      </mesh>

      <CameraRig />

      {/*
        Full 360 degree rotation. The terrain surrounds the viewpoint and the
        perimeter rises into distant peaks, so there is no hollow side to find.
        Only the vertical angle is limited, to keep the camera above ground.
      */}
      <OrbitControls
        target={[VIEWPOINT.x, terrainHeight(VIEWPOINT.x, VIEWPOINT.z) + 40, VIEWPOINT.z]}
        enablePan={false}
        minDistance={5}
        maxDistance={260}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.495}
      />
    </>
  )
}
