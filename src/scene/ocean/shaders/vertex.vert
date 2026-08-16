varying vec2 vWorldXZ;
varying vec3 vWorldPosition;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vWorldXZ = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
