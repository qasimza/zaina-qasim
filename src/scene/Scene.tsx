import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import CameraRig, { lookTarget } from './CameraRig'
import Ocean from './ocean/Ocean'
import Sky, { HORIZON_COLOUR } from './sky/Sky'
import Terrain from './terrain/Terrain'
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

        The target sits down the seaward slope, so the default view looks toward
        the ocean. Polar angle is measured from straight up.
      */}
      <OrbitControls
        target={lookTarget()}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.72}
      />
    </>
  )
}
