uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunColour;
uniform vec3 uSunDirection;

varying vec3 vDirection;

void main() {
  vec3 dir = normalize(vDirection);

  // Altitude gradient. The power curve keeps the horizon band tight.
  float altitude = clamp(dir.y, 0.0, 1.0);
  vec3 colour = mix(uHorizon, uZenith, pow(altitude, 0.55));

  // Broad glow around the sun, then the disc itself.
  float sunAmount = max(dot(dir, normalize(uSunDirection)), 0.0);
  colour += uSunColour * pow(sunAmount, 7.0) * 0.5;
  colour += uSunColour * pow(sunAmount, 900.0) * 0.7;

  // Tone curve. Compresses the highlights so the sun does not clip flat.
  colour = 1.0 - exp(-colour * 1.9);

  gl_FragColor = vec4(colour, 1.0);
}
