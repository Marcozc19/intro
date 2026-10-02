import * as THREE from 'three'
import { rng } from './kit'

export const ISLAND_R = 20
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

/** Where the river's centre line is (its x) at a given z. It runs north to south. */
export function riverX(z: number): number {
  return -4.4 + 0.9 * Math.sin(z * 0.3)
}

/** Ground height at any point. Water level is y = 0. Everything else sits on this. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z) / shore(Math.atan2(z, x))
  const land = smooth(1.06, 0.86, d)
  const hills = 0.07 * Math.sin(x * 0.3 + 1) * Math.cos(z * 0.27) + 0.04 * Math.sin(x * 0.7 - z * 0.5)
  // The river bed is cut just below sea level, so the sea fills it.
  const channel = smooth(1.8, 0.7, Math.abs(x - riverX(z)))
  return -1.6 + land * (2.1 + hills - channel * 0.85)
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
      // Calm inland (the river), choppy at the shore, flat again far out
      const r = Math.hypot(x, z)
      const amp = 0.11 * smooth(11, 19, r) * (1 - smooth(30, 75, r))
      if (amp === 0) continue
      pos.setY(i, amp * (Math.sin(x * 0.8 + t * 1.1) + Math.cos(z * 0.7 + t * 0.9) + 0.6 * Math.sin((x + z) * 0.35 + t * 0.6)))
    }
    pos.needsUpdate = true
  }
  return mesh
}

/** Streaks of current drifting down the river, so it reads as flowing water. */
export function createRiverFlow(): THREE.Mesh {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')!
  const rand = rng(5)
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 16; i++) {
    ctx.globalAlpha = 0.35 + rand() * 0.5
    ctx.beginPath()
    ctx.roundRect(6 + rand() * 46, rand() * 256, 4 + rand() * 4, 22 + rand() * 40, 3)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapT = THREE.RepeatWrapping

  const HALF = 1.0
  const positions: number[] = []
  const uvs: number[] = []
  const index: number[] = []
  let length = 0
  let row = 0
  for (let z = -ISLAND_R; z <= ISLAND_R; z += 0.4) {
    const x = riverX(z)
    if (groundHeight(x, z) > -0.1 || Math.hypot(x, z) > ISLAND_R - 2) continue // only where the bed is cut
    positions.push(x - HALF, 0.05, z, x + HALF, 0.05, z)
    uvs.push(0, length / 7, 1, length / 7)
    if (row > 0) {
      const j = row * 2
      index.push(j - 2, j, j - 1, j - 1, j, j + 1)
    }
    length += 0.4
    row++
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(index)
  const mesh = new THREE.Mesh(
    g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }),
  )
  mesh.name = 'river-flow'
  mesh.renderOrder = 2 // after the sea, which would otherwise be drawn over it
  mesh.userData.tick = (t: number) => (tex.offset.y = -t * 0.09)
  return mesh
}
