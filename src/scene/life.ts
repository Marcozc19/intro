import * as THREE from 'three'
import { box, cyl, mat, rng } from './kit'
import { puffGeo, puffMat } from './props'

// Ambient motion. Anything that moves sets `userData.tick(time, dt)` on itself;
// the world calls every tick once per frame (and skips them all when the
// visitor prefers reduced motion).

// ── Sailboat circling the island ────────────────────────────────────────────

export function createSailboat(): THREE.Group {
  const boat = new THREE.Group()
  boat.name = 'sailboat'
  boat.scale.setScalar(1.5)
  box(boat, 0.7, 0.28, 1.7, mat('#f3efe2'), 0, -0.06, 0)
  const bow = cyl(boat, 0.001, 0.35, 0.6, mat('#f3efe2'), 0, 0, 1.15, 4)
  bow.rotation.x = Math.PI / 2 // point the tip forward
  bow.position.y = 0.08
  bow.scale.z = 0.4
  box(boat, 0.5, 0.3, 0.5, mat('#2c5d73'), 0, 0.22, -0.35)
  cyl(boat, 0.025, 0.025, 1.7, mat('#c9ced6'), 0, 0.22, 0.3, 8)
  const sailGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.45, 0.25), new THREE.Vector3(0, 1.85, 0.25), new THREE.Vector3(0, 0.45, -0.7),
  ])
  sailGeo.computeVertexNormals()
  const sail = new THREE.Mesh(
    sailGeo, new THREE.MeshStandardMaterial({ color: '#fffaf0', side: THREE.DoubleSide, roughness: 0.9 }),
  )
  boat.add(sail)

  const place = (t: number) => {
    const a = 1.1 + t * 0.06
    const r = 33.5 + Math.sin(a * 3) * 1.5
    boat.position.set(Math.cos(a) * r, 0.05 + Math.sin(t * 1.3) * 0.05, Math.sin(a) * r)
    boat.rotation.set(Math.sin(t * 1.1) * 0.05, Math.atan2(-Math.sin(a), Math.cos(a)), Math.sin(t * 0.9) * 0.07)
  }
  place(0)
  boat.userData.tick = place
  return boat
}

// ── Birds ───────────────────────────────────────────────────────────────────

export function createBirds(count = 5): THREE.Group {
  const flock = new THREE.Group()
  flock.name = 'birds'
  const wingGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0.13), new THREE.Vector3(0, 0, -0.13), new THREE.Vector3(0.5, 0, -0.05),
  ])
  wingGeo.computeVertexNormals()
  const feather = new THREE.MeshStandardMaterial({ color: '#42525c', side: THREE.DoubleSide, roughness: 1 })
  const wings: { left: THREE.Mesh; right: THREE.Mesh; phase: number }[] = []
  for (let i = 0; i < count; i++) {
    const bird = new THREE.Group()
    // V formation behind the leader
    const row = Math.ceil(i / 2)
    bird.position.set((i % 2 === 0 ? 1 : -1) * row * 0.8, (i % 3) * 0.15, -row * 0.9)
    const right = new THREE.Mesh(wingGeo, feather)
    const left = new THREE.Mesh(wingGeo, feather)
    left.scale.x = -1
    bird.add(left, right)
    box(bird, 0.07, 0.06, 0.3, feather, 0, -0.03, 0).castShadow = false
    flock.add(bird)
    wings.push({ left, right, phase: i * 1.3 })
  }
  const place = (t: number) => {
    const a = t * 0.22
    const r = 12 + Math.sin(t * 0.13) * 3
    flock.position.set(Math.cos(a) * r, 11.5 + Math.sin(t * 0.4) * 1.2, Math.sin(a) * r)
    flock.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a))
    for (const w of wings) {
      const flap = Math.sin(t * 9 + w.phase) * 0.6
      w.right.rotation.z = flap
      w.left.rotation.z = -flap
    }
  }
  place(0)
  flock.userData.tick = place
  return flock
}

// ── Small clouds drifting past behind the island ────────────────────────────

export function createDriftingClouds(count = 7): THREE.Group {
  const rand = rng(23)
  const group = new THREE.Group()
  group.name = 'drifting-clouds'
  const SPAN = 70
  const clouds: { object: THREE.Group; x0: number; speed: number }[] = []
  for (let i = 0; i < count; i++) {
    const cloud = new THREE.Group()
    const puffs = 4 + Math.floor(rand() * 3)
    for (let j = 0; j < puffs; j++) {
      const puff = new THREE.Mesh(puffGeo, puffMat)
      const s = 0.8 + rand() * 0.8
      puff.position.set((j - puffs / 2) * 1.1 + rand() * 0.4, rand() * 0.4, rand() * 0.8)
      puff.scale.set(s, s * 0.6, s)
      cloud.add(puff)
    }
    cloud.position.set(0, 7 + rand() * 8, -16 - rand() * 30)
    cloud.scale.setScalar(0.9 + rand() * 0.8)
    group.add(cloud)
    clouds.push({ object: cloud, x0: (rand() * 2 - 1) * SPAN, speed: 0.35 + rand() * 0.5 })
  }
  const place = (t: number) => {
    for (const c of clouds) {
      const x = c.x0 + t * c.speed
      c.object.position.x = ((((x + SPAN) % (SPAN * 2)) + SPAN * 2) % (SPAN * 2)) - SPAN
    }
  }
  place(0)
  group.userData.tick = place
  return group
}

// ── Chimney smoke ───────────────────────────────────────────────────────────

export function createSmoke(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  const puffs: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = []
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      puffGeo,
      new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 1, transparent: true, depthWrite: false }),
    )
    g.add(puff)
    puffs.push(puff)
  }
  const place = (t: number) => {
    puffs.forEach((puff, i) => {
      const p = (t * 0.22 + i / puffs.length) % 1
      puff.position.set(p * p * 0.7, p * 1.7, Math.sin(i * 2.1 + p * 3) * 0.08)
      puff.scale.setScalar(0.1 + p * 0.3)
      puff.material.opacity = Math.min(1, p * 6) * (1 - p) * 0.8
    })
  }
  place(0.4)
  g.userData.tick = place
  return g
}
