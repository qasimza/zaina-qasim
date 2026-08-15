import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { VIEWPOINT, terrainHeight } from './heightField'

/**
 * Places the camera in the basin at the centre of the landscape.
 *
 * The height comes from the height field, not a fixed number, so the camera
 * cannot end up inside a hill when the terrain shape changes.
 */
export default function CameraRig() {
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    const groundY = terrainHeight(VIEWPOINT.x, VIEWPOINT.z)
    camera.position.set(VIEWPOINT.x + 120, groundY + VIEWPOINT.eyeHeight + 70, VIEWPOINT.z + 150)
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}
