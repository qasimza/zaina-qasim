import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import * as THREE from 'three'
import { SUMMIT, VIEWPOINT, terrainHeight } from './heightField'

/**
 * Stands the camera on the path and aims it at the summit.
 *
 * The height comes from the height field, not a guessed number, so the camera
 * cannot end up buried in the slope when the terrain shape changes.
 */
export default function CameraRig() {
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    const groundY = terrainHeight(VIEWPOINT.x, VIEWPOINT.z)
    camera.position.set(VIEWPOINT.x, groundY + VIEWPOINT.eyeHeight, VIEWPOINT.z)

    const summitY = terrainHeight(SUMMIT.x, SUMMIT.z)
    camera.lookAt(new THREE.Vector3(SUMMIT.x, summitY + 4, SUMMIT.z))
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}
