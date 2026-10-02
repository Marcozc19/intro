import * as THREE from 'three'
import type { Place } from '../data'
import { mat } from './kit'
import { groundHeight, ISLAND_R, riverX } from './terrain'

// A river splits the island in two. Education sits on the west bank (the
// campus); career fills the east bank (downtown) in rows of two, oldest at the
// front, each row on its own street off the central avenue. The avenue runs
// from the dock up to the ladder at the centre, and a bridge joins the banks.

export type Plot = { position: THREE.Vector3; rotationY: number }

const CAMPUS: [x: number, z: number, rotationY: number][] = [
  [-11.6, 8.2, 0.45],
  [-11.2, -5.5, 0.35],
  [-13.6, 1.4, 0.4],
]
const DOWNTOWN = { x: 4.4, z: 6.6, columns: 2, dx: 6, dz: 7.2 }
const STREET_OFFSET = 3.4 // each street runs this far in front of its row
export const BRIDGE = { z: 1.2, west: riverX(1.2) - 2.6, east: riverX(1.2) + 2.6 }

function plot(x: number, z: number, rotationY: number): Plot {
  return { position: new THREE.Vector3(x, groundHeight(x, z), z), rotationY }
}

/** One plot per place, in the same order as the places. */
export function plots(places: Place[]): Plot[] {
  let campus = 0
  let downtown = 0
  return places.map((place) => {
    if (place.kind === 'education') {
      const [x, z, rot] = CAMPUS[campus++ % CAMPUS.length]
      return plot(x, z, rot)
    }
    const k = downtown++
    const col = k % DOWNTOWN.columns
    const row = Math.floor(k / DOWNTOWN.columns)
    // A slight turn per building so the rows don't look ruled.
    return plot(DOWNTOWN.x + col * DOWNTOWN.dx, DOWNTOWN.z - row * DOWNTOWN.dz, (col === 0 ? 0.07 : -0.07) * (row % 2 ? -1 : 1))
  })
}

const v = (x: number, z: number) => new THREE.Vector2(x, z)

/** Every footpath as a line of corner points. */
function pathLines(places: Place[], sites: Plot[]): THREE.Vector2[][] {
  const lines: THREE.Vector2[][] = []
  const rows = Math.ceil(places.filter((p) => p.kind === 'career').length / DOWNTOWN.columns)
  const lastStreet = DOWNTOWN.z - (rows - 1) * DOWNTOWN.dz + STREET_OFFSET
  // Avenue: dock to the ladder, and on to the last street
  lines.push([v(0, ISLAND_R - 3.6), v(0, Math.min(0, lastStreet))])
  for (let row = 0; row < rows; row++) {
    const z = DOWNTOWN.z - row * DOWNTOWN.dz + STREET_OFFSET
    lines.push([v(0, z), v(DOWNTOWN.x + (DOWNTOWN.columns - 1) * DOWNTOWN.dx + 2.6, z)])
  }
  // Bridge approaches, then a campus walk along the west bank to each front door
  lines.push([v(BRIDGE.east, BRIDGE.z), v(0, BRIDGE.z)])
  const landing = v(BRIDGE.west - 0.9, BRIDGE.z)
  lines.push([v(BRIDGE.west, BRIDGE.z), landing])
  places.forEach((place, i) => {
    if (place.kind !== 'education') return
    const s = sites[i]
    const door = v(s.position.x + Math.sin(s.rotationY) * 3.1, s.position.z + Math.cos(s.rotationY) * 3.1)
    // Walk beside the river first, so the path doesn't cut through a building.
    const bank = v(landing.x, door.y)
    lines.push(Math.abs(door.y - landing.y) > 4 ? [landing, bank, door] : [landing, door])
  })
  return lines
}

function densify(line: THREE.Vector2[], step = 0.4): THREE.Vector2[] {
  const out: THREE.Vector2[] = []
  for (let i = 0; i < line.length - 1; i++) {
    const n = Math.max(1, Math.ceil(line[i].distanceTo(line[i + 1]) / step))
    for (let k = 0; k < n; k++) out.push(line[i].clone().lerp(line[i + 1], k / n))
  }
  out.push(line[line.length - 1].clone())
  return out
}

/** Paving for all the footpaths, plus the points along them for trees to avoid. */
export function createPaths(places: Place[], sites: Plot[]): { mesh: THREE.Mesh; points: THREE.Vector2[] } {
  const HALF = 0.5
  const positions: number[] = []
  const index: number[] = []
  const points: THREE.Vector2[] = []
  for (const line of pathLines(places, sites)) {
    const pts = densify(line)
    points.push(...pts)
    const base = positions.length / 3
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const dir = b.clone().sub(a).normalize()
      for (const s of [-1, 1]) {
        const x = p.x - dir.y * HALF * s
        const z = p.y + dir.x * HALF * s
        positions.push(x, groundHeight(x, z) + 0.035, z)
      }
      if (i > 0) {
        const j = base + i * 2
        index.push(j - 2, j, j - 1, j - 1, j, j + 1)
      }
    })
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  const m = mat('#efe6d2', 1).clone()
  m.side = THREE.DoubleSide
  const mesh = new THREE.Mesh(g, m)
  mesh.receiveShadow = true
  mesh.name = 'paths'
  return { mesh, points }
}
