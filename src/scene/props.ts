import * as THREE from 'three'
import { box, cyl, glow, mat, rng } from './kit'
import { groundHeight, ISLAND_R } from './terrain'

// The cloud deck sits far above any view of the island, so its top (and the
// ideas on it) can never be seen from below.
export const SKY_Y = 100

// ── Trees ───────────────────────────────────────────────────────────────────

export function createTrees(avoid: { points: THREE.Vector2[]; radius: number }[], count = 95): THREE.Group {
  const rand = rng(42)
  const spots: { x: number; z: number; s: number }[] = []
  let guard = 0
  while (spots.length < count && guard++ < 6000) {
    const a = rand() * Math.PI * 2
    const r = 2.4 + Math.sqrt(rand()) * (ISLAND_R - 3.5)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (groundHeight(x, z) < 0.42) continue
    const p = new THREE.Vector2(x, z)
    if (avoid.some((set) => set.points.some((q) => q.distanceTo(p) < set.radius))) continue
    if (spots.some((t) => Math.hypot(t.x - x, t.z - z) < 1.1)) continue
    spots.push({ x, z, s: 0.6 + rand() * 0.45 })
  }

  const group = new THREE.Group()
  group.name = 'trees'
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 6), mat('#7a5a44'), spots.length)
  // Crowns sway in the wind: the vertex shader leans each one a little, more at
  // the top, with a phase taken from where the tree stands.
  const wind = { value: 0 }
  const crownMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true })
  crownMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind
    shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float swayPhase = instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.9;
        float swayLean = position.y + 0.62;
        transformed.x += sin(uWind * 1.5 + swayPhase) * 0.07 * swayLean;
        transformed.z += cos(uWind * 1.2 + swayPhase) * 0.05 * swayLean;
      #endif`,
    )
  }
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.62, 1), crownMat, spots.length)
  group.userData.tick = (t: number) => (wind.value = t)
  const m = new THREE.Object3D()
  const greens = ['#4f9a55', '#5fae5d', '#3f8a52', '#79b85f']
  const color = new THREE.Color()
  spots.forEach((t, i) => {
    const y = groundHeight(t.x, t.z)
    m.position.set(t.x, y + 0.35 * t.s, t.z)
    m.rotation.set(0, 0, 0)
    m.scale.setScalar(t.s)
    m.updateMatrix()
    trunks.setMatrixAt(i, m.matrix)
    m.position.set(t.x, y + 1.05 * t.s, t.z)
    m.rotation.set(0, rand() * Math.PI, 0)
    m.scale.set(t.s, t.s * (1 + rand() * 0.35), t.s)
    m.updateMatrix()
    crowns.setMatrixAt(i, m.matrix)
    color.set(rand() < 0.12 ? '#f0a8c0' : greens[Math.floor(rand() * greens.length)])
    crowns.setColorAt(i, color)
  })
  for (const mesh of [trunks, crowns]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  return group
}

// ── Dock ────────────────────────────────────────────────────────────────────

export function createDock(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'dock'
  const wood = mat('#b98b5e')
  const z0 = ISLAND_R - 3
  box(g, 1.3, 0.1, 4.4, wood, 0, 0.3, z0 + 2.2)
  for (const z of [1, 2.5, 4.1]) for (const x of [-0.6, 0.6]) cyl(g, 0.07, 0.07, 1.5, mat('#8b6644'), x, -0.9, z0 + z, 8)
  return g
}

// ── Bridge ──────────────────────────────────────────────────────────────────

/** An arched footbridge running east-west across the river. */
export function createBridge(west: number, east: number, z: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'bridge'
  const stone = mat('#d6cfbf')
  const wood = mat('#a9774c')
  const SEGMENTS = 9
  const span = east - west
  const deckY = (u: number) => groundHeight(west, z) + 0.02 + Math.sin(u * Math.PI) * 0.55
  for (let i = 0; i < SEGMENTS; i++) {
    const u0 = i / SEGMENTS
    const u1 = (i + 1) / SEGMENTS
    const rise = deckY(u1) - deckY(u0)
    const run = span / SEGMENTS
    const piece = new THREE.Group()
    piece.position.set(west + span * (u0 + u1) / 2, (deckY(u0) + deckY(u1)) / 2, z)
    piece.rotation.z = Math.atan2(rise, run)
    const len = Math.hypot(run, rise) + 0.04
    box(piece, len, 0.12, 1.3, stone, 0, -0.06, 0)
    for (const side of [-0.6, 0.6]) {
      box(piece, len, 0.05, 0.06, wood, 0, 0.42, side)
      if (i % 2 === 0) box(piece, 0.07, 0.42, 0.07, wood, 0, 0.03, side)
    }
    g.add(piece)
  }
  // Piers standing in the water
  for (const u of [0.3, 0.7]) box(g, 0.3, 1.2, 1.1, stone, west + span * u, -0.7, z)
  return g
}

// ── Hot air balloon ─────────────────────────────────────────────────────────

/** The way up to the clouds. Origin is the bottom of the basket. */
export function createBalloon(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'balloon'

  // Striped fabric: alternating gores running top to bottom
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 8
  const ctx = c.getContext('2d')!
  const gores = ['#ef6f5a', '#fff3dc', '#f4b942', '#fff3dc']
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = gores[i % gores.length]
    ctx.fillRect(i * 32, 0, 32, 8)
  }
  const stripes = new THREE.CanvasTexture(c)
  stripes.colorSpace = THREE.SRGBColorSpace
  const fabric = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.75 })

  const envelope = new THREE.Mesh(new THREE.SphereGeometry(1.75, 32, 20), fabric)
  envelope.position.y = 4.15
  envelope.scale.y = 1.12
  envelope.castShadow = true
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 0.42, 1.5, 32, 1, true), fabric)
  throat.position.y = 2.2
  throat.castShadow = true
  g.add(envelope, throat)
  cyl(g, 0.44, 0.44, 0.08, mat('#8a4b3a'), 0, 1.42, 0, 24)

  // Basket, ropes and burner
  const wicker = mat('#a9774c')
  box(g, 0.8, 0.5, 0.8, wicker, 0, 0, 0)
  box(g, 0.9, 0.08, 0.9, mat('#7d5636'), 0, 0.5, 0)
  for (const [x, z] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) {
    cyl(g, 0.015, 0.015, 0.95, mat('#5b4634'), x, 0.5, z, 6)
  }
  cyl(g, 0.1, 0.12, 0.14, mat('#5b6068', 0.4, 0.6), 0, 0.95, 0, 12)
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 10), glow('#ffb347', 1.6))
  flame.position.y = 1.3
  flame.userData.tick = (t: number) => flame.scale.set(1, 0.8 + Math.sin(t * 17) * 0.15 + Math.sin(t * 29) * 0.1, 1)
  g.add(flame)

  // Generous invisible click target
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 1, 6.4, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  )
  hit.position.y = 3.2
  g.add(hit)
  // The balloon ignores scene fog, so it stays clear while the ride fogs
  // everything else out. Materials are cloned because some are shared.
  g.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.material = (o.material as THREE.Material).clone()
    o.material.fog = false
  })
  return g
}

// ── Clouds ──────────────────────────────────────────────────────────────────

export const puffGeo = new THREE.IcosahedronGeometry(1, 2)
export const puffMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.22,
})

/** The cloud deck: a wide floor of cloud with a gap where the balloon comes up. */
export function createCloudBank(gapX: number, gapZ: number): THREE.InstancedMesh {
  const rand = rng(11)
  const RADIUS = 27
  const spots: [number, number][] = []
  while (spots.length < 340) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * RADIUS
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.hypot(x - gapX, z - gapZ) > 3.4) spots.push([x, z])
  }
  const mesh = new THREE.InstancedMesh(puffGeo, puffMat, spots.length)
  const m = new THREE.Object3D()
  spots.forEach(([x, z], i) => {
    const s = 1.5 + rand() * 1.5
    m.position.set(x, SKY_Y - 3.1 + rand() * 1.1, z)
    m.scale.set(s, s * 0.6, s)
    m.updateMatrix()
    mesh.setMatrixAt(i, m.matrix)
  })
  mesh.name = 'cloud-bank'
  return mesh
}

/** A small cloud with an idea sitting on it: one per project. */
export function createProjectCloud(color: string, seed: number): THREE.Group {
  const rand = rng(seed)
  const g = new THREE.Group()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = i === 0 ? 0 : 0.9 + rand() * 0.7
    const s = i === 0 ? 1.5 : 0.8 + rand() * 0.5
    const puff = new THREE.Mesh(puffGeo, puffMat)
    puff.position.set(Math.cos(a) * r, -0.5 + rand() * 0.15, Math.sin(a) * r)
    puff.scale.set(s, s * 0.55, s)
    g.add(puff)
  }
  // Lightbulb
  cyl(g, 0.2, 0.24, 0.3, mat('#5b6068', 0.4, 0.6), 0, 0.3, 0, 16)
  const filament = glow(color, 0.8)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), filament)
  bulb.position.y = 1
  bulb.userData.tick = (t: number) => (filament.emissiveIntensity = 0.75 + Math.sin(t * 1.6 + seed) * 0.3)
  g.add(bulb)
  g.userData.bob = 0.18
  return g
}
