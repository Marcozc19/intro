import * as THREE from 'three'
import { box, cyl, glow, mat, rng } from './kit'
import { groundHeight, ISLAND_R } from './terrain'

export const SKY_Y = 20

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

// ── Ladder ──────────────────────────────────────────────────────────────────

export function createLadder(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'ladder'
  const base = groundHeight(0, 0)
  const height = SKY_Y + 0.9 - base
  const wood = mat('#c8965f')
  g.position.y = base
  for (const x of [-0.36, 0.36]) cyl(g, 0.055, 0.055, height, wood, x, 0, 0, 8)
  const rungCount = Math.floor(height / 0.45)
  const rungGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6)
  rungGeo.rotateZ(Math.PI / 2)
  const rungs = new THREE.InstancedMesh(rungGeo, wood, rungCount)
  const m = new THREE.Object3D()
  for (let i = 0; i < rungCount; i++) {
    m.position.set(0, 0.35 + i * 0.45, 0)
    m.updateMatrix()
    rungs.setMatrixAt(i, m.matrix)
  }
  rungs.castShadow = true
  g.add(rungs)
  // Stone footing
  cyl(g, 0.9, 1, 0.16, mat('#d6cfbf'), 0, -0.04, 0, 24)
  // Generous invisible click target around the lower section
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 12, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  )
  hit.position.y = 6
  hit.name = 'ladder-hit'
  g.add(hit)
  return g
}

// ── Clouds ──────────────────────────────────────────────────────────────────

export const puffGeo = new THREE.IcosahedronGeometry(1, 2)
export const puffMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.22,
})

/** The cloud bank the ladder disappears into, with a gap around the ladder. */
export function createCloudBank(): THREE.InstancedMesh {
  const rand = rng(11)
  const count = 120
  const mesh = new THREE.InstancedMesh(puffGeo, puffMat, count)
  const m = new THREE.Object3D()
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = 2.6 + Math.sqrt(rand()) * 8.6
    const s = 1.1 + rand() * 1.3
    m.position.set(Math.cos(a) * r, SKY_Y - 3.1 + rand() * 1.1, Math.sin(a) * r)
    m.scale.set(s, s * 0.6, s)
    m.updateMatrix()
    mesh.setMatrixAt(i, m.matrix)
  }
  mesh.name = 'cloud-bank'
  mesh.userData.tick = (t: number) => (mesh.rotation.y = t * 0.012)
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
