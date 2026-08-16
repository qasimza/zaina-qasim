import * as THREE from 'three'
import fragmentColor from './shaders/frag.color.glsl'
import fragmentCommon from './shaders/frag.common.glsl'
import vertexBegin from './shaders/vert.begin.glsl'
import vertexCommon from './shaders/vert.common.glsl'

/**
 * World-space noise in the fragment shader.
 * Breaks flat vertex paint into soft grain. No extra meshes or textures.
 *
 * Cache key: Three.js may reuse one compiled program for similar
 * MeshStandardMaterials. This name marks our patched variant so it is not
 * mixed with a plain stock material.
 */
const TERRAIN_SHADER_KEY = 'coastal-terrain-albedo-noise'

export function createTerrainMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
  })

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexCommon}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexBegin}`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentCommon}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragmentColor}`)
  }

  material.customProgramCacheKey = () => TERRAIN_SHADER_KEY
  return material
}
