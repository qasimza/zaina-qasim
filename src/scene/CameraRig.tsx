import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import * as THREE from 'three'
import { VIEWPOINT, terrainHeight } from './heightField'

/** How far seaward the look target sits, in world units. */
const LOOK_AHEAD = 130

/**
 * Point down the seaward slope. Slightly above the ground so the camera looks
 * along the hillside toward the ocean, not into the dirt.
 */
export function lookTarget(): [number, number, number] {
  const z = VIEWPOINT.z - LOOK_AHEAD
  const y = terrainHeight(VIEWPOINT.x, z) + 3
  return [VIEWPOINT.x, y, z]
}

/**
 * Stands the camera on the hill crest and aims it slightly down the slope.
 *
 * The height comes from the height field, not a fixed number, so the camera
 * cannot end up inside the ground when the terrain shape changes.
 */
export default function CameraRig() {
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    const groundY = terrainHeight(VIEWPOINT.x, VIEWPOINT.z)
    camera.position.set(VIEWPOINT.x, groundY + VIEWPOINT.eyeHeight, VIEWPOINT.z)
    const [lx, ly, lz] = lookTarget()
    camera.lookAt(new THREE.Vector3(lx, ly, lz))
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}
