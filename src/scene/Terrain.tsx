import { useMemo } from 'react'
import * as THREE from 'three'
import { TERRAIN_SIZE, pathBlend, terrainHeight } from './heightField'

/** Palette, from the locked art direction. */
const PATH_COLOUR = new THREE.Color('#c9b79a') // pale gravel
const GRASS_LOW = new THREE.Color('#8d9464') // sage
const GRASS_HIGH = new THREE.Color('#c2ab6e') // dry gold
const ROCK = new THREE.Color('#a89887') // exposed stone

interface Props {
  /** Vertices per side. More gives finer relief and costs more. */
  segments?: number
}

export default function Terrain({ segments = 200 }: Props) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const position = geo.attributes.position
    const colours = new Float32Array(position.count * 3)
    const colour = new THREE.Color()

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      const height = terrainHeight(x, z)
      position.setY(i, height)

      // Colour by height: sage low down, dry gold higher up.
      const t = THREE.MathUtils.clamp(height / 40, 0, 1)
      colour.copy(GRASS_LOW).lerp(GRASS_HIGH, t)

      // Steep faces show rock.
      const slope = Math.abs(terrainHeight(x + 1, z) - height)
      if (slope > 1.2) colour.lerp(ROCK, Math.min(1, (slope - 1.2) * 0.8))

      // Blend toward gravel across the path edge, never a hard cut.
      colour.lerp(PATH_COLOUR, pathBlend(x, z))

      colours[i * 3] = colour.r
      colours[i * 3 + 1] = colour.g
      colours[i * 3 + 2] = colour.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    geo.computeVertexNormals()
    return geo
  }, [segments])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  )
}
