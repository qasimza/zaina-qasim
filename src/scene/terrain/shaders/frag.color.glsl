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
