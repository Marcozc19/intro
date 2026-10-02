import * as THREE from 'three'
import type { Place } from '../data'
import { mat } from './kit'
import { groundHeight, ISLAND_R, riverX } from './terrain'

// A river splits the island in two. Education sits on the west bank (the
// campus). Career is scattered over the east bank (downtown), newest at the
// front and oldest at the back, along a winding path that ends at the hot air
// balloon. A second path follows the river to the bridge.

export type Plot = { position: THREE.Vector3; rotationY: number }
type Spot = [x: number, z: number, rotationY: number]

const CAMPUS: Spot[] = [
  [-12.6, 5.2, 0.3],
  [-11.2, -5.5, 0.35],
  [-13.6, 1.4, 0.4],
]
/**
 * Downtown plots, newest role first. The first stands alone at the front; the
 * rest are scattered behind it, kept out of its line of sight from the
 * opening view.
 */
const DOWNTOWN: Spot[] = [
  [6.2, 10.6, -0.05],
  [11.8, 5.2, -0.3],
  [2.6, 4.6, -0.1],
  [9.4, -7.4, -0.1],
  [13, -2.4, -0.35],
  [3.4, -4.6, 0.3],
]
/** Where the hot air balloon is moored: the far end of downtown. */
export const BALLOON = { x: 4.6, z: -11.6 }
export const BRIDGE = { z: 1.2, west: riverX(1.2) - 2.6, east: riverX(1.2) + 2.6 }
/**
 * The Tsinghua gate stands on the lawn at the front left of the first campus
 * building, turned at an angle to it and clear of the paths.
 */
export const CAMPUS_GATE = { x: -13.7, z: 10, rotationY: 0.75, scale: 0.85 }

function plot([x, z, rotationY]: Spot): Plot {
  return { position: new THREE.Vector3(x, groundHeight(x, z), z), rotationY }
}

/** One plot per place, in the same order as the places. */
export function plots(places: Place[]): Plot[] {
  const careers = places.filter((p) => p.kind === 'career').length
  let campus = 0
  let career = 0
  return places.map((place) => {
    if (place.kind === 'education') return plot(CAMPUS[campus++ % CAMPUS.length])
    // Places are listed oldest first, so count from the back.
    return plot(DOWNTOWN[(careers - 1 - career++) % DOWNTOWN.length])
  })
}

const v = (x: number, z: number) => new THREE.Vector2(x, z)

/** A smooth line through the given points. */
function winding(points: THREE.Vector2[]): THREE.Vector2[] {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.y)), false, 'catmullrom', 0.5)
  return curve.getSpacedPoints(Math.ceil(curve.getLength() / 0.4)).map((p) => v(p.x, p.z))
}

const doorOf = (s: Plot, reach: number) =>
  v(s.position.x + Math.sin(s.rotationY) * reach, s.position.z + Math.cos(s.rotationY) * reach)

/** Every footpath as a line of points. */
function pathLines(places: Place[], sites: Plot[]): THREE.Vector2[][] {
  const lines: THREE.Vector2[][] = []
  // Main walk: dock, through downtown, to the balloon
  const main = winding([
    v(0, ISLAND_R - 3.6), v(1.6, 14), v(6, 13.9), v(9.8, 12.6), v(10.2, 8.6), v(8.5, 3.2),
    v(7, -1), v(7.4, -3.6), v(6.2, -7.5), v(BALLOON.x, BALLOON.z + 1.2),
  ])
  // River walk: from the dock end up to the bridge, then across to rejoin the main walk
  const river = winding([v(1.6, 14), v(0.4, 8), v(-0.5, 3.2), v(BRIDGE.east + 0.3, BRIDGE.z), v(1.8, 0.2), v(4.8, -1), v(7, -1)])
  lines.push(main, river)
  // A short spur from each downtown door to the nearest walk
  const walks = [...main, ...river]
  places.forEach((place, i) => {
    if (place.kind !== 'career') return
    const door = doorOf(sites[i], 2.6)
    const nearest = walks.reduce((a, b) => (a.distanceTo(door) < b.distanceTo(door) ? a : b))
    if (nearest.distanceTo(door) > 0.8) lines.push([door, nearest])
  })
  // Bridge landing, then a campus walk along the west bank to each front door
  const landing = v(BRIDGE.west - 0.9, BRIDGE.z)
  lines.push([v(BRIDGE.west, BRIDGE.z), landing])
  places.forEach((place, i) => {
    if (place.kind !== 'education') return
    const door = doorOf(sites[i], 3.1)
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
