import { useMemo } from 'react'
import * as THREE from 'three'
import { TERRAIN_SIZE, terrainHeight } from './heightField'

/**
 * Palette. Colour is chosen by height and by slope, not height alone. Slope is
 * what separates a grassy shoulder from a bare rock face at the same altitude.
 */
const SAGE = new THREE.Color('#8d9a63')
const DRY_GOLD = new THREE.Color('#c4ae74')
const ROCK = new THREE.Color('#a4988a')
const ROCK_DARK = new THREE.Color('#8a7f72')

interface Props {
  /** Vertices per side. More gives finer relief and costs more. */
  segments?: number
}

export default function Terrain({ segments = 300 }: Props) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const position = geo.attributes.position
    const colours = new Float32Array(position.count * 3)
    const colour = new THREE.Color()
    const step = TERRAIN_SIZE / segments

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      const height = terrainHeight(x, z)
      position.setY(i, height)

      // Slope, as the rise over one grid step in each direction.
      const dx = terrainHeight(x + step, z) - height
      const dz = terrainHeight(x, z + step) - height
      const slope = Math.hypot(dx, dz) / step

      // Sage low down, drying to gold as it climbs. The coastal hills palette.
      const dryness = THREE.MathUtils.clamp((height - 20) / 60, 0, 1)
      colour.copy(SAGE).lerp(DRY_GOLD, dryness)

      // Steep ground loses its cover and shows rock. Slope, not height, decides
      // this: a shoulder and a cliff at the same altitude look different.
      const rockAmount = THREE.MathUtils.clamp((slope - 0.5) * 1.5, 0, 1)
      const rockShade = ROCK.clone().lerp(ROCK_DARK, THREE.MathUtils.clamp(slope - 1, 0, 1))
      colour.lerp(rockShade, rockAmount)

      colours[i * 3] = colour.r
      colours[i * 3 + 1] = colour.g
      colours[i * 3 + 2] = colour.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    geo.computeVertexNormals()
    return geo
  }, [segments])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  )
}
