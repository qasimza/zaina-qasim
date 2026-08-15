import { useMemo } from 'react'
import * as THREE from 'three'
import { TERRAIN_SIZE, terrainHeight } from './heightField'

/**
 * Palette. Colour is chosen by height and by slope, not height alone. Slope is
 * what separates a grassy shoulder from a bare rock face at the same altitude.
 */
const SAGE = new THREE.Color('#7f9a52')
const DRY_GOLD = new THREE.Color('#c9b06a')
const ROCK = new THREE.Color('#a4988a')
const ROCK_DARK = new THREE.Color('#8a7f72')

/**
 * Injects cheap world-space noise into MeshStandardMaterial so flat vertex
 * colours break up into dry grass patches. Lighting and fog stay with Three.js.
 */
const GRASS_NOISE_KEY = 'terrain-grass-noise-v1'

interface Props {
  /** Vertices per side. More gives finer relief and costs more. */
  segments?: number
}

function hashNoiseGlsl(): string {
  return /* glsl */ `
float terrainHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float terrainNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = terrainHash(i);
  float b = terrainHash(i + vec2(1.0, 0.0));
  float c = terrainHash(i + vec2(0.0, 1.0));
  float d = terrainHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
`
}

function attachGrassNoise(material: THREE.MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
attribute float cover;
varying float vCover;
varying vec3 vTerrainWorldPos;
`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
vCover = cover;
vTerrainWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
varying float vCover;
varying vec3 vTerrainWorldPos;
${hashNoiseGlsl()}
`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
{
  float coverAmt = clamp(vCover, 0.0, 1.0);
  vec2 xz = vTerrainWorldPos.xz;

  // Broad patches: sage vs dry gold, like chaparral clumps.
  float patchNoise = terrainNoise(xz * 0.06);
  vec3 sage = vec3(0.48, 0.58, 0.30);
  vec3 gold = vec3(0.78, 0.68, 0.40);
  vec3 patchColour = mix(sage, gold, patchNoise);
  diffuseColor.rgb = mix(diffuseColor.rgb, patchColour, 0.28 * coverAmt);

  // Fine stalk speckles. Two octaves keep it from looking tiled.
  float fine = terrainNoise(xz * 0.55 + 13.0);
  float finer = terrainNoise(xz * 2.4 + 41.0);
  float blades = (fine * 0.65 + finer * 0.35) * 2.0 - 1.0;
  diffuseColor.rgb *= 1.0 + blades * 0.22 * coverAmt;

  // Tiny dark flecks read as soil between clumps.
  float fleck = step(0.78, terrainNoise(xz * 3.1 + 7.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.72, fleck * 0.35 * coverAmt);
}
`,
      )
  }

  material.customProgramCacheKey = () => GRASS_NOISE_KEY
}

export default function Terrain({ segments = 300 }: Props) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const position = geo.attributes.position
    const colours = new Float32Array(position.count * 3)
    const cover = new Float32Array(position.count)
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
      cover[i] = 1 - rockAmount
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    geo.setAttribute('cover', new THREE.BufferAttribute(cover, 1))
    geo.computeVertexNormals()
    return geo
  }, [segments])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
    })
    attachGrassNoise(mat)
    return mat
  }, [])

  return (
    <mesh geometry={geometry} material={material} receiveShadow />
  )
}
