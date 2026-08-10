// TEMPORARY. Loads a generated world mesh to judge whether it is usable.
//
// Marble reconstructs a scene as seen from one viewpoint, so the geometry forms a
// shell around that point. The camera must sit at the centre of the shell and look
// outward. Placing it outside shows only the rim.
import { OrbitControls, useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import * as THREE from 'three'

const MODEL_URL = '/models/terrain-test.glb'

export default function TerrainTest() {
  const { scene } = useGLTF(MODEL_URL)
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    // The export ships metallicFactor 1, which renders terrain almost black.
    // It also carries vertex colours, which need switching on.
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const material = mesh.material as THREE.MeshStandardMaterial
      material.metalness = 0
      material.roughness = 1
      material.vertexColors = true
      material.side = THREE.DoubleSide
      material.needsUpdate = true
    })

    // Put the camera at the centre of the shell, at roughly eye height.
    const box = new THREE.Box3().setFromObject(scene)
    const centre = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    camera.position.set(centre.x, centre.y, centre.z)
    camera.near = 0.1
    camera.far = Math.max(size.x, size.z) * 3
    camera.updateProjectionMatrix()

    console.info(
      '[terrain] centre',
      centre.toArray().map((n) => Math.round(n)),
      'size',
      size.toArray().map((n) => Math.round(n)),
    )
  }, [scene, camera])

  return (
    <>
      <primitive object={scene} />
      {/* Orbit around a point just in front of the camera, so dragging looks around. */}
      <OrbitControls target={[0, 5, -1]} enablePan enableZoom />
    </>
  )
}

useGLTF.preload(MODEL_URL)
