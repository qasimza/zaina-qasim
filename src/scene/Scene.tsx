import { OrbitControls } from '@react-three/drei'
import GrassTest from './GrassTest'
import { useRenderStore } from '../store/renderStore'

// The element owns its base count. The store owns the multiplier.
const BASE_GRASS = 100_000

// Test override, so a phone can try values without a rebuild: ?blades=1000000
const bladeOverride = Number(new URLSearchParams(window.location.search).get('blades'))

export default function Scene() {
  const scatterDensity = useRenderStore((state) => state.settings.scatterDensity)
  const bladeCount = bladeOverride || Math.round(BASE_GRASS * scatterDensity)

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 3]} intensity={1.4} />

      {/* Hillside placeholder. Flat colour, no art. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#9aa871" />
      </mesh>

      {/* TEMPORARY device test. Not for commit. */}
      <GrassTest count={bladeCount} />
      <OrbitControls />
    </>
  )
}
