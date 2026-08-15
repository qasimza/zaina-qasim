import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SEA_LEVEL } from './heightField'
import { HORIZON_COLOUR } from './Sky'

/**
 * Ocean surface.
 *
 * A flat plane, not simulated geometry. The movement lives entirely in the
 * shader: two crossing wave fields perturb the normal, which drives both the
 * sun glitter and how much sky reflects. That is cheap, because the cost is one
 * plane regardless of how detailed the water looks.
 */
const vertexShader = /* glsl */ `
varying vec2 vWorldXZ;
varying vec3 vWorldPosition;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vWorldXZ = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSkyColour;
uniform vec3 uSunColour;
uniform vec3 uSunDirection;
uniform vec3 uFogColour;
uniform float uFogDensity;

varying vec2 vWorldXZ;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

/**
 * Wave height field.
 *
 * Crossed sine waves produce a regular diamond lattice, which reads as a
 * pattern rather than as water. Layered noise, with the sample point warped by
 * a lower layer, breaks that up. Each octave also drifts in its own direction,
 * so no single flow direction dominates.
 */
float waves(vec2 p, float time) {
  float total = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  float normalise = 0.0;
  vec2 drift = vec2(1.0, 0.6);

  for (int i = 0; i < 4; i++) {
    // Warp the sample point by the previous layer, so crests bend.
    vec2 q = p * frequency + drift * time * (0.35 + float(i) * 0.11);
    q += vec2(total * 0.4, total * 0.3);
    total += (valueNoise(q) - 0.5) * amplitude;
    normalise += amplitude;
    amplitude *= 0.52;
    frequency *= 2.17;   // not a whole ratio, so octaves never line up
    drift = vec2(drift.y, -drift.x);
  }

  return total / normalise;
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  vec2 p = vWorldXZ * 0.035;

  // Sample the wave field either side of this point to get the slope, which is
  // what the normal is built from.
  float e = 0.06;
  float centre = waves(p, uTime);
  float slopeX = waves(p + vec2(e, 0.0), uTime) - centre;
  float slopeZ = waves(p + vec2(0.0, e), uTime) - centre;

  // Y stays large so the surface reads as broadly flat and only glints, rather
  // than looking like crumpled foil.
  vec3 normal = normalize(vec3(slopeX * 9.0, 1.0, slopeZ * 9.0));
  float waveA = centre;

  // Fresnel. Water is dark looking straight down and mirror-like at a glancing
  // angle. This single term is what makes it read as water rather than paint.
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

  vec3 colour = mix(uDeep, uShallow, 0.35 + waveA * 0.1);
  colour = mix(colour, uSkyColour, clamp(fresnel * 1.4, 0.0, 0.85));

  // Sun glitter, from the reflected view direction.
  vec3 reflection = reflect(-viewDir, normal);
  float glint = pow(max(dot(reflection, normalize(uSunDirection)), 0.0), 220.0);
  colour += uSunColour * glint * 1.6;

  // Match the scene fog, so the far water melts into the horizon and the plane
  // edge never shows. The blend is capped below 1, so the sea keeps a trace of
  // its own colour all the way out and never becomes a flat band of haze.
  float dist = length(cameraPosition - vWorldPosition);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  colour = mix(colour, uFogColour, clamp(fog, 0.0, 0.82));

  gl_FragColor = vec4(colour, 1.0);
}
`

interface Props {
  sunDirection: THREE.Vector3
  fogDensity: number
  size?: number
}

export default function Ocean({ sunDirection, fogDensity, size = 6000 }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color('#4d94a6') },
      uDeep: { value: new THREE.Color('#1f4e63') },
      uSkyColour: { value: new THREE.Color('#9fc4dd') },
      uSunColour: { value: new THREE.Color('#ffdcaa') },
      uSunDirection: { value: sunDirection.clone().normalize() },
      uFogColour: { value: HORIZON_COLOUR },
      uFogDensity: { value: fogDensity },
    }),
    [sunDirection, fogDensity],
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_LEVEL, -400]}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
