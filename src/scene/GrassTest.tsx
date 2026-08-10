// TEMPORARY device test. Not for commit.
// Shader source adapted from https://github.com/Nitash-Biswas/grass-shader-glsl
// That repository has no licence, so this code must not ship.
// The CPU LOD loop from the original ran every frame over every blade and
// allocated a Vector3 per blade. This version builds the matrices one time.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uHalfWidth;

varying float vElevation;
varying float vSideGradient;
varying vec3 vNormal;
varying vec3 vFakeNormal;
varying vec3 vPosition;

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

mat3 rotationY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

float bezier(float t, float p1) {
    float invT = 1.0 - t;
    return 2.0 * invT * t * p1 + t * t;
}

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod(Pi, 289.0);
    vec4 ix = Pi.xzxz;
    vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz;
    vec4 fy = Pf.yyww;
    vec4 i = permute(permute(ix) + iy);
    vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x, gy.x);
    vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z);
    vec2 g11 = vec2(gx.w, gy.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 *
        vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;
    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

vec3 deform(vec3 pos) {
    vec3 localPosition = pos;
    vec3 instanceZ = normalize(vec3(0.0, 0.0, instanceMatrix[0].z));
    float hash = rand(vec2(instanceMatrix[3].x, instanceMatrix[3].z));

    float bendStrength = mix(0.3, 0.6, hash);
    float bendStart = mix(0.0, 0.3, hash);
    float t = clamp((pos.y / 2.0 - bendStart) / (1.0 - bendStart), 0.0, 1.0);
    float topBendFactor = bezier(t, 0.1);

    float gentleSway = sin(uTime * uSpeed * 0.8 + hash * 10.0) * 0.1;
    vec3 gentleOffset = normalize(vec3(1.0, 0.0, 1.0)) * gentleSway * t;

    vec3 worldPos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    float wave = cnoise(worldPos.xz * 0.3 + vec2(uTime * uSpeed * 0.2, 0.0));
    vec3 strongOffset = vec3(0.0, 0.0, 1.0) * (wave * 0.65) * pow(pos.y, 2.0);

    localPosition += instanceZ * bendStrength * topBendFactor;
    localPosition += gentleOffset;
    localPosition += strongOffset;
    localPosition.y -= 0.1 * strongOffset.z;

    vec3 camPos = inverse(viewMatrix)[3].xyz;
    vec2 toCamera2D = normalize(camPos.xz - instanceMatrix[3].xz);
    localPosition = rotationY(atan(toCamera2D.y, toCamera2D.x)) * localPosition;

    return localPosition;
}

void main() {
    vec3 p = deform(position);
    vec3 offsetX = deform(position + vec3(0.01, 0.0, 0.0));
    vec3 offsetY = deform(position + vec3(0.0, 0.01, 0.0));

    vec4 worldPosition = instanceMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;

    vElevation = position.y;
    vPosition = worldPosition.xyz;
    vSideGradient = 1.0 - ((position.x + uHalfWidth) / (2.0 * uHalfWidth));

    vNormal = normalize(cross(offsetX - p, offsetY - p));
    vec3 invNormal = vNormal;
    invNormal.x *= -1.0;
    vFakeNormal = mix(vNormal, invNormal, vSideGradient);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFogColor;

varying float vElevation;
varying float vSideGradient;
varying vec3 vNormal;
varying vec3 vFakeNormal;
varying vec3 vPosition;

vec3 directionalLight(vec3 lightColor, float lightIntensity, vec3 normal, vec3 lightPosition, vec3 viewDirection, float specularPower) {
    vec3 lightDirection = normalize(lightPosition);
    vec3 lightReflection = reflect(-lightDirection, normal);
    float shading = max(0.0, dot(normal, lightDirection));
    float specular = max(0.0, -dot(lightReflection, viewDirection));
    specular = pow(specular, specularPower) * shading;
    return lightColor * lightIntensity * (shading + specular);
}

void main() {
    float gradient = smoothstep(0.2, 1.0, vElevation);
    vec3 finalColor = mix(uBaseColor, uTipColor, gradient);

    vec3 normal = gl_FrontFacing ? vFakeNormal : -vFakeNormal;
    vec3 viewDirection = normalize(cameraPosition - vPosition);

    vec3 light = vec3(0.5);
    light += directionalLight(uFogColor, 1.0, normal, vec3(2.0, 2.0, 2.0), viewDirection, 100.0);
    finalColor *= light;

    float fogFactor = smoothstep(5.0, 20.0, length(cameraPosition - vPosition));
    gl_FragColor = vec4(mix(finalColor, uFogColor, fogFactor), 1.0);
}
`

const HALF_WIDTH = 0.06
const BLADE_HEIGHT = 1

function createBladeGeometry(segments: number) {
  const taper = 0.005
  const positions: number[] = []

  for (let i = 0; i < segments - 1; i++) {
    const y0 = (i / segments) * BLADE_HEIGHT
    const y1 = ((i + 1) / segments) * BLADE_HEIGHT
    positions.push(
      -HALF_WIDTH + taper * i, y0, 0,
      HALF_WIDTH - taper * i, y0, 0,
      -HALF_WIDTH + taper * (i + 1), y1, 0,
      -HALF_WIDTH + taper * (i + 1), y1, 0,
      HALF_WIDTH - taper * i, y0, 0,
      HALF_WIDTH - taper * (i + 1), y1, 0,
    )
  }

  positions.push(
    -HALF_WIDTH + taper * (segments - 1), ((segments - 1) / segments) * BLADE_HEIGHT, 0,
    HALF_WIDTH - taper * (segments - 1), ((segments - 1) / segments) * BLADE_HEIGHT, 0,
    0, BLADE_HEIGHT, 0,
  )

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.computeVertexNormals()
  return geo
}

interface GrassTestProps {
  count?: number
  fieldSize?: number
  segments?: number
}

export default function GrassTest({ count = 50000, fieldSize = 60, segments = 7 }: GrassTestProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const geometry = useMemo(() => createBladeGeometry(segments), [segments])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 3 },
          uHalfWidth: { value: HALF_WIDTH },
          uTipColor: { value: new THREE.Color('#c8be9c') },
          uBaseColor: { value: new THREE.Color('#404709') },
          uFogColor: { value: new THREE.Color('#e6ebef') },
        },
        side: THREE.DoubleSide,
      }),
    [],
  )

  // Place the blades one time, when the mesh mounts.
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * fieldSize,
        0,
        (Math.random() - 0.5) * fieldSize,
      )
      dummy.rotation.y = Math.random() * Math.PI * 2
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [count, fieldSize])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />
}
