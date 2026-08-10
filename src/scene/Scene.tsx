import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import SplatLandscape, { Landmark } from './SplatLandscape'

export default function Scene() {
  return (
    <>
      {/* Splats carry baked colour. The lights are only for the placed meshes. */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <Suspense fallback={null}>
        <SplatLandscape />
      </Suspense>

      {/* Interactive placeholders. These stand in for the museum, signpost and mailbox. */}
      <Landmark position={[0, 0, -4]} label="museum" />
      <Landmark position={[-3, 0, -2]} label="signpost" color="#7a8b5e" />
      <Landmark position={[3, 0, -2]} label="mailbox" color="#4a7fc9" />

      <OrbitControls makeDefault />
    </>
  )
}
