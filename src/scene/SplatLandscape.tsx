// TEMPORARY. Loads a Gaussian splat landscape through Spark, to judge the
// splat pipeline: load time, frame rate, and whether meshes sit in it correctly.
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'
import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'

const SPLAT_URL = '/models/landscape.spz'

interface Props {
  onLoaded?: (info: { seconds: number }) => void
}

export default function SplatLandscape({ onLoaded }: Props) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const [splat, setSplat] = useState<SplatMesh | null>(null)

  useEffect(() => {
    const startedAt = performance.now()

    // Spark does work outside the normal render loop, so it needs the renderer.
    const spark = new SparkRenderer({ renderer: gl })
    scene.add(spark)

    const mesh = new SplatMesh({
      url: SPLAT_URL,
      raycastable: true,
      onLoad: () => {
        const seconds = (performance.now() - startedAt) / 1000
        console.info(`[splat] loaded in ${seconds.toFixed(1)}s`)
        onLoaded?.({ seconds })
      },
    })

    // Marble .spz exports already match three.js orientation. Applying the usual
    // splat Y-flip here turns the scene upside down.
    scene.add(mesh)
    setSplat(mesh)

    return () => {
      scene.remove(mesh)
      scene.remove(spark)
      mesh.dispose?.()
    }
  }, [gl, scene, onLoaded])

  return splat ? <primitive object={splat} /> : null
}

/** A landmark placeholder. Grows and changes colour on hover, logs on click. */
export function Landmark({
  position,
  label,
  color = '#c96f4a',
}: {
  position: [number, number, number]
  label: string
  color?: string
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <mesh
      position={position}
      scale={hovered ? 1.4 : 1}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(event) => {
        event.stopPropagation()
        console.info(`[landmark] clicked ${label}`)
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? '#f2c14e' : color}
        emissive={hovered ? '#f2c14e' : '#000000'}
        emissiveIntensity={hovered ? 0.4 : 0}
      />
    </mesh>
  )
}
