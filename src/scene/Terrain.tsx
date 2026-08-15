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

/**
 * World-space noise in the fragment shader.
 * Breaks flat vertex paint into soft grain. No extra meshes or textures.
 *
 * Cache key: Three.js may reuse one compiled program for similar
 * MeshStandardMaterials. This name marks our patched variant so it is not
 * mixed with a plain stock material.
 */
const TERRAIN_SHADER_KEY = 'coastal-terrain-albedo-noise'

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
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float terrainFbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * terrainNoise(p * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
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

  // Keep large colour drift very mild — blocky patches come from this scale.
  float patchNoise = terrainFbm(xz * 0.22);
  vec3 sage = vec3(0.55, 0.60, 0.39);
  vec3 gold = vec3(0.77, 0.68, 0.45);
  vec3 patchColour = mix(sage, gold, patchNoise);
  diffuseColor.rgb = mix(diffuseColor.rgb, patchColour, 0.08 * coverAmt);

  // Salt-and-pepper: high-frequency grain near the camera.
  float dist = length(cameraPosition.xz - xz);
  float nearDetail = clamp(1.0 - dist / 100.0, 0.25, 1.0);

  float mid = terrainFbm(xz * 4.5 + 13.0);
  float fine = terrainFbm(xz * 14.0 + 41.0);
  float pepper = terrainFbm(xz * 32.0 + 7.0);
  float blades = (mid * 0.35 + fine * 0.4 + pepper * 0.25 * nearDetail) * 2.0 - 1.0;
  diffuseColor.rgb *= 1.0 + blades * 0.16 * coverAmt;

  // Soft soil flecks — continuous, not hard blocks.
  float soil = smoothstep(0.58, 0.88, pepper);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.82, soil * 0.2 * coverAmt * nearDetail);
}
`,
      )
  }

  material.customProgramCacheKey = () => TERRAIN_SHADER_KEY
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

      const dx = terrainHeight(x + step, z) - height
      const dz = terrainHeight(x, z + step) - height
      const slope = Math.hypot(dx, dz) / step

      const dryness = THREE.MathUtils.smoothstep(12, 85, height)
      colour.copy(SAGE).lerp(DRY_GOLD, dryness)

      const rockAmount = THREE.MathUtils.smoothstep(0.45, 1.35, slope)
      const rockShade = ROCK.clone().lerp(ROCK_DARK, THREE.MathUtils.smoothstep(0.8, 1.8, slope))
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
      roughness: 0.92,
      metalness: 0,
    })
    attachGrassNoise(mat)
    return mat
  }, [])

  return <mesh geometry={geometry} material={material} receiveShadow />
}
