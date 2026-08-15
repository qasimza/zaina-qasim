import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import CameraRig from './CameraRig'
import Ocean from './Ocean'
import Sky, { HORIZON_COLOUR } from './Sky'
import Terrain from './Terrain'
import { VIEWPOINT, terrainHeight } from './heightField'
import { useRenderStore } from '../store/renderStore'

/** Low sun, raking across the hills from the left. */
const SUN = new THREE.Vector3(-180, 90, 60)

/** Shared by the scene fog and the ocean shader, so the two always agree. */
const FOG_DENSITY = 0.0016

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
      <fogExp2 attach="fog" args={[HORIZON_COLOUR.getHex(), FOG_DENSITY]} />

      <Ocean sunDirection={SUN} fogDensity={FOG_DENSITY} />
      <Terrain segments={segments} />

      <CameraRig />

      {/*
        Full 360 degree rotation. The terrain surrounds the viewpoint and the
        perimeter rises into far hills, so there is no hollow side to find.

        Polar angle is measured from straight up. The camera orbits a target one
        unit ahead, so a larger angle puts the camera below the target and tilts
        the view upward into the sky. 0.9 stops a little short of straight up,
        where the controls gimbal.
      */}
      <OrbitControls
        target={[
          VIEWPOINT.x,
          terrainHeight(VIEWPOINT.x, VIEWPOINT.z) + VIEWPOINT.eyeHeight,
          VIEWPOINT.z - 1,
        ]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.9}
      />
    </>
  )
}
