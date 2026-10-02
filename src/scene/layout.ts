import * as THREE from 'three'
import { groundHeight, ISLAND_R } from './terrain'
import { mat } from './kit'

// The footpath circles in from the south shore to the ladder at the centre.
// Buildings stand alternately on either side of it, oldest at the shore.

const TURNS = 1.13
const R_START = 13
const R_END = 1.6
const TH_START = Math.PI / 2 // +z, the side facing the opening camera
const LAST_BUILDING_T = 0.84 // keep the centre clear for the ladder
const SIDE_OFFSET = 2.5

function spiral(t: number): THREE.Vector2 {
  // Radius shrinks slowly at first, so buildings form a wide ring, then curls in.
  const r = R_START + (R_END - R_START) * Math.pow(t, 2.2)
  const th = TH_START + t * TURNS * Math.PI * 2
  return new THREE.Vector2(r * Math.cos(th), r * Math.sin(th))
}

export type Plot = { position: THREE.Vector3; rotationY: number }

/** Evenly spaced plots along the path, by walking distance rather than by angle. */
export function plots(count: number): Plot[] {
  const N = 600
  const lengths = [0]
  let prev = spiral(0)
  for (let i = 1; i <= N; i++) {
    const p = spiral((i / N) * LAST_BUILDING_T)
    lengths.push(lengths[i - 1] + p.distanceTo(prev))
    prev = p
  }
  const total = lengths[N]
  const out: Plot[] = []
  for (let k = 0; k < count; k++) {
    const target = ((k + 0.5) / count) * total
    let i = lengths.findIndex((l) => l >= target)
    if (i < 1) i = 1
    const t = (i / N) * LAST_BUILDING_T
    const p = spiral(t)
    const outward = p.clone().normalize()
    // Alternate sides; the last two stay outside so they don't crowd the ladder.
    const side = k >= count - 2 ? 1 : k % 2 === 0 ? -1 : 1
    const x = p.x + outward.x * SIDE_OFFSET * side
    const z = p.y + outward.y * SIDE_OFFSET * side
    // Front door (+z in building space) faces the sea, so every facade can be
    // seen from outside the island without the ladder in the way.
    out.push({
      position: new THREE.Vector3(x, groundHeight(x, z), z),
      rotationY: Math.atan2(outward.x, outward.y),
    })
  }
  return out
}

/** Points along the centre of the path, including the walk up from the shore. */
export function pathPoints(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  for (let z = ISLAND_R - 2.8; z > R_START; z -= 0.25) pts.push(new THREE.Vector2(0, z))
  for (let i = 0; i <= 500; i++) pts.push(spiral(i / 500))
  return pts
}

export function createPath(): THREE.Mesh {
  const pts = pathPoints()
  const half = 0.5
  const positions: number[] = []
  const index: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dir = b.clone().sub(a).normalize()
    const nx = -dir.y
    const nz = dir.x
    for (const s of [-1, 1]) {
      const x = pts[i].x + nx * half * s
      const z = pts[i].y + nz * half * s
      positions.push(x, groundHeight(x, z) + 0.035, z)
    }
    if (i > 0) {
      const j = i * 2
      index.push(j - 2, j, j - 1, j - 1, j, j + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  const m = mat('#efe6d2', 1).clone()
  m.side = THREE.DoubleSide
  const mesh = new THREE.Mesh(g, m)
  mesh.receiveShadow = true
  mesh.name = 'path'
  return mesh
}
