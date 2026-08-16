import * as THREE from 'three'

/**
 * Horizon colour, also used for fog so the two always agree.
 *
 * This must stay a pale, low-saturation haze. A warm sandy value makes distant
 * water fade to the colour of sand, because the ocean fogs toward this too.
 * Warmth at the horizon comes from the sun glow, not from this base colour.
 */
export const HORIZON_COLOUR = new THREE.Color('#cdd3d2')
