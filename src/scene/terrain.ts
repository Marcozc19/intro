import * as THREE from 'three'
import { rng } from './kit'

export const ISLAND_R = 19
export const WATER = '#7cc7cf'
const SAND = '#ead9a6'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Distance from the centre to the shoreline in a given direction. */
function shore(theta: number) {
  return ISLAND_R + Math.sin(3 * theta + 0.5) + 0.6 * Math.sin(5 * theta + 2) + 0.3 * Math.sin(9 * theta + 1)
}

/** Ground height at any point. Water level is y = 0. Everything else sits on this. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z) / shore(Math.atan2(z, x))
  const land = smooth(1.06, 0.86, d)
  const hills = 0.07 * Math.sin(x * 0.3 + 1) * Math.cos(z * 0.27) + 0.04 * Math.sin(x * 0.7 - z * 0.5)
  return -1.6 + land * (2.1 + hills)
}

export function createTerrain(): THREE.Mesh {
  const size = ISLAND_R * 2 + 10
  const g = new THREE.PlaneGeometry(size, size, 220, 220)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const sand = new THREE.Color(SAND)
  const grass = new THREE.Color('#86b96a')
  const grassDark = new THREE.Color('#6da35a')
  const c = new THREE.Color()
  const rand = rng(7)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = groundHeight(x, z)
    pos.setY(i, y)
    const patch = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(z * 0.6) * 2) * Math.cos(z * 0.8)
    c.copy(grass).lerp(grassDark, patch * 0.6 + rand() * 0.15)
    c.lerpColors(sand, c, smooth(0.16, 0.36, y))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
  mesh.receiveShadow = true
  mesh.name = 'terrain'
  return mesh
}

/** Sand floor under the whole sea, so the water colour is the same everywhere. */
export function createSeabed(): THREE.Mesh {
  const g = new THREE.CircleGeometry(170, 48)
  g.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: SAND, roughness: 1 }))
  mesh.position.y = -1.62
  mesh.name = 'seabed'
  return mesh
}

/** Low-poly sea whose facets rise and fall. Waves flatten out away from the island. */
export function createWater(): THREE.Mesh {
  const RADIUS = 170
  const g = new THREE.RingGeometry(0.01, RADIUS, 96, 64)
  const pos = g.attributes.position
  // Pack the rings closer together near the island, where the waves are.
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i))
    const k = r === 0 ? 0 : (RADIUS * Math.pow(r / RADIUS, 2.4)) / r
    pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k)
  }
  g.rotateX(-Math.PI / 2)
  const m = new THREE.MeshStandardMaterial({
    color: WATER, transparent: true, opacity: 0.82, roughness: 0.2, metalness: 0.05, flatShading: true,
  })
  const mesh = new THREE.Mesh(g, m)
  mesh.receiveShadow = true
  mesh.name = 'water'
  mesh.userData.tick = (t: number) => {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const amp = 0.11 * (1 - smooth(30, 75, Math.hypot(x, z)))
      if (amp === 0) continue
      pos.setY(i, amp * (Math.sin(x * 0.8 + t * 1.1) + Math.cos(z * 0.7 + t * 0.9) + 0.6 * Math.sin((x + z) * 0.35 + t * 0.6)))
    }
    pos.needsUpdate = true
  }
  return mesh
}
