import * as THREE from 'three'
import { box, cyl, glow, mat, rng } from './kit'
import { groundHeight } from './terrain'

// Signature props: one animated set piece per experience that shows what the
// work there was about. Each sets `userData.tick(time)` like the ambient props.

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

// ── TikTok: a phone screen with a swiping video feed ────────────────────────

function feedTexture(cards: number): THREE.CanvasTexture {
  const W = 256
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H * cards
  const ctx = c.getContext('2d')!
  const palettes = [['#ff5f6d', '#ffc371'], ['#24c6dc', '#514a9d'], ['#f953c6', '#b91d73'], ['#11998e', '#38ef7d'], ['#fc4a1a', '#f7b733']]
  for (let i = 0; i < cards; i++) {
    const y = i * H
    const [a, b] = palettes[i % palettes.length]
    const bg = ctx.createLinearGradient(0, y, W, y + H)
    bg.addColorStop(0, a)
    bg.addColorStop(1, b)
    ctx.fillStyle = bg
    ctx.fillRect(0, y, W, H)
    // The "video": one bold shape per card
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    if (i % 3 === 0) ctx.arc(W * 0.42, y + H * 0.4, 70, 0, Math.PI * 2)
    else if (i % 3 === 1) ctx.roundRect(W * 0.16, y + H * 0.24, 130, 160, 28)
    else {
      ctx.moveTo(W * 0.2, y + H * 0.56)
      ctx.lineTo(W * 0.45, y + H * 0.2)
      ctx.lineTo(W * 0.7, y + H * 0.56)
    }
    ctx.fill()
    // Like / comment / share column
    ctx.fillStyle = '#ffffff'
    for (let k = 0; k < 3; k++) {
      ctx.beginPath()
      ctx.arc(W - 36, y + H * 0.52 + k * 62, 18, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#fe2c55'
    ctx.beginPath()
    ctx.arc(W - 36, y + H * 0.52, 10, 0, Math.PI * 2)
    ctx.fill()
    // Caption lines
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillRect(20, y + H - 96, 130, 14)
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillRect(20, y + H - 68, 170, 10)
    ctx.fillRect(20, y + H - 48, 110, 10)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 1 / cards)
  tex.anisotropy = 4
  return tex
}

/** A phone-shaped screen facing +z whose feed swipes to the next video every few seconds. */
export function createFeedScreen(w: number, h: number): THREE.Group {
  const CARDS = 5
  const g = new THREE.Group()
  box(g, w + 0.14, h + 0.14, 0.07, mat('#0b0b0d', 0.4), 0, -h / 2 - 0.07, 0)
  const tex = feedTexture(CARDS)
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.75, roughness: 0.4 }),
  )
  screen.position.z = 0.04
  g.add(screen)
  const PERIOD = 2.6
  const SWIPE = 0.5
  const place = (t: number) => {
    const card = Math.floor(t / PERIOD)
    const p = clamp01((t - card * PERIOD - (PERIOD - SWIPE)) / SWIPE)
    tex.offset.y = 1 - (card + 1 + ease(p)) / CARDS
  }
  place(0)
  g.userData.tick = place
  return g
}

// ── TikTok: the note logo on the roof ───────────────────────────────────────

function note(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const TUBE = 0.15
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.24, TUBE, 14, 32), material)
  head.position.set(-0.14, 0.39, 0)
  const stem = new THREE.Mesh(new THREE.BoxGeometry(TUBE * 2, 0.86, TUBE * 2), material)
  stem.position.set(0.1, 0.39 + 0.43, 0)
  // The flag: a quarter ring curving from the top of the stem down to the right
  const flag = new THREE.Mesh(new THREE.TorusGeometry(0.34, TUBE, 14, 18, Math.PI / 2), material)
  flag.position.set(0.44, 1.25, 0)
  flag.rotation.z = Math.PI
  g.add(head, stem, flag)
  g.scale.z = 0.5
  return g
}

/** The musical-note mark in the two brand colours: a red note with a cyan one offset behind it. */
export function createNoteLogo(cyan: THREE.Material, red: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const back = note(cyan)
  back.position.set(-0.07, 0.06, -0.08)
  g.add(back, note(red))
  return g
}

// ── Cornell Tech: the Roosevelt Island tram ─────────────────────────────────

/**
 * Manhattan in miniature: a long, narrow island packed with towers that rise
 * to two peaks (midtown and downtown), with the Empire State and Chrysler
 * buildings, One World Trade, Central Park, and the Statue of Liberty off the
 * tip. Local x runs the length of the island; the tram lands at z = -1.3.
 */
function createManhattan(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'manhattan'
  const LENGTH = 5.2 // half-length
  const WIDTH = 2.5 // half-width
  const GROUND = 0.48

  const shore = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), mat('#ead9a6', 1))
  shore.scale.set(LENGTH + 0.5, 0.75, WIDTH + 0.4)
  shore.position.y = -0.22
  const streets = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), mat('#c9cdd0', 1))
  streets.scale.set(LENGTH, 0.7, WIDTH)
  streets.position.y = -0.14
  g.add(shore, streets)

  // Central Park: a green rectangle with a few trees
  const PARK = { x: 2.1, z: 0.25, w: 2.1, d: 1.3 }
  box(g, PARK.w, 0.05, PARK.d, mat('#7fb56a', 1), PARK.x, GROUND + 0.02, PARK.z)
  const rand = rng(77)
  const foliage = new THREE.MeshStandardMaterial({ color: '#4f9a55', roughness: 1, flatShading: true })
  for (let i = 0; i < 7; i++) {
    const tree = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), foliage)
    tree.position.set(PARK.x + (rand() - 0.5) * (PARK.w - 0.4), GROUND + 0.2, PARK.z + (rand() - 0.5) * (PARK.d - 0.3))
    g.add(tree)
  }

  // Landmarks
  const LANDMARKS = [{ x: -0.5, z: 0.35 }, { x: 0.45, z: 1.2 }, { x: -3.7, z: 0.15 }]
  const limestone = mat('#c3bbad')
  const [empire, chrysler, wtc] = LANDMARKS
  box(g, 0.72, 1.8, 0.6, limestone, empire.x, GROUND, empire.z)
  box(g, 0.52, 1, 0.44, limestone, empire.x, GROUND + 1.8, empire.z)
  box(g, 0.3, 0.55, 0.28, limestone, empire.x, GROUND + 2.8, empire.z)
  cyl(g, 0.02, 0.06, 0.85, mat('#9aa3ab', 0.4, 0.6), empire.x, GROUND + 3.35, empire.z, 8)
  box(g, 0.46, 2.1, 0.46, mat('#b4b9be'), chrysler.x, GROUND, chrysler.z)
  cyl(g, 0.02, 0.27, 1, mat('#dfe5ea', 0.25, 0.8), chrysler.x, GROUND + 2.1, chrysler.z, 8)
  const glass = mat('#6fa9c4', 0.2, 0.5)
  cyl(g, 0.24, 0.42, 3.3, glass, wtc.x, GROUND, wtc.z, 4).rotation.y = Math.PI / 4
  cyl(g, 0.015, 0.04, 0.9, mat('#dfe5ea', 0.3, 0.7), wtc.x, GROUND + 3.3, wtc.z, 8)

  // Everything else: a street grid of blocks, drawn as one instanced mesh
  const blocks: { x: number; z: number; w: number; d: number; h: number; color: string }[] = []
  const palette = ['#c3bbad', '#b8826a', '#9aa6b0', '#6f97ad', '#d8d2c4', '#8d7f77', '#a9b7c0']
  for (let x = -LENGTH + 0.8; x <= LENGTH - 0.8; x += 0.78) {
    for (let z = -WIDTH + 0.55; z <= WIDTH - 0.5; z += 0.74) {
      if ((x / (LENGTH - 0.5)) ** 2 + (z / (WIDTH - 0.35)) ** 2 > 1) continue // off the island
      if (Math.hypot(x, z + 1.3) < 1) continue // the tram station
      if (Math.abs(x - PARK.x) < PARK.w / 2 + 0.25 && Math.abs(z - PARK.z) < PARK.d / 2 + 0.25) continue
      if (LANDMARKS.some((l) => Math.hypot(x - l.x, z - l.z) < 0.7)) continue
      const midtown = 1.5 * Math.exp(-(((x + 0.4) / 1.3) ** 2))
      const downtown = 1.2 * Math.exp(-(((x + 3.6) / 0.9) ** 2))
      blocks.push({
        x: x + (rand() - 0.5) * 0.12, z: z + (rand() - 0.5) * 0.12,
        w: 0.46 + rand() * 0.16, d: 0.44 + rand() * 0.14,
        h: 0.55 + rand() * 0.75 + midtown + downtown,
        color: palette[Math.floor(rand() * palette.length)],
      })
    }
  }
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), blocks.length)
  const m = new THREE.Object3D()
  const color = new THREE.Color()
  blocks.forEach((b, i) => {
    m.position.set(b.x, GROUND - 0.15 + b.h / 2, b.z)
    m.scale.set(b.w, b.h + 0.3, b.d)
    m.updateMatrix()
    towers.setMatrixAt(i, m.matrix)
    towers.setColorAt(i, color.set(b.color))
  })
  g.add(towers)

  // Statue of Liberty on her own rock, off the downtown tip
  const liberty = new THREE.Group()
  liberty.position.set(-LENGTH - 1.5, 0, 0.5)
  g.add(liberty)
  const rock = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10), mat('#ead9a6', 1))
  rock.scale.y = 0.45
  rock.position.y = -0.05
  liberty.add(rock)
  const copper = mat('#7fb8a4', 0.7)
  box(liberty, 0.36, 0.42, 0.36, mat('#c9c2b4'), 0, 0.18, 0)
  cyl(liberty, 0.08, 0.14, 0.55, copper, 0, 0.6, 0, 10)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), copper)
  head.position.y = 1.22
  liberty.add(head)
  const arm = cyl(liberty, 0.025, 0.03, 0.34, copper, 0.1, 1.1, 0, 6)
  arm.rotation.z = -0.25
  const torch = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glow('#ffd76a', 1.4))
  torch.position.set(0.15, 1.48, 0)
  liberty.add(torch)
  return g
}

function pylon(parent: THREE.Object3D, x: number, y: number, z: number, height: number) {
  const steel = mat('#8f9aa3', 0.5, 0.4)
  cyl(parent, 0.1, 0.2, height, steel, x, y, z, 10)
  cyl(parent, 0.3, 0.3, 0.1, steel, x, y + height, z, 12)
}

/**
 * A cable from a station on land out to a small islet, with a red cabin that
 * shuttles back and forth. Built in world space so it doesn't scale with a
 * building. `land` is where the station stands and `heading` the way it runs.
 */
export function createTram(land: THREE.Vector3, heading: THREE.Vector3, length = 8.5): THREE.Group {
  const group = new THREE.Group()
  group.name = 'tram'
  const rotationY = Math.atan2(heading.x, heading.z)
  const HEIGHT = 3.4
  land = land.clone().setY(groundHeight(land.x, land.z))
  const sea = land.clone().addScaledVector(heading, length)
  sea.y = 0.45

  // The far stop is Manhattan. The tram lands on its near shore.
  const manhattan = createManhattan()
  manhattan.position.copy(sea).setY(0).addScaledVector(heading, 1.3)
  manhattan.rotation.y = rotationY
  group.add(manhattan)

  pylon(group, land.x, land.y, land.z, HEIGHT)
  pylon(group, sea.x, sea.y, sea.z, HEIGHT)
  // Boarding platform on the campus side
  const platform = box(group, 1.1, 0.25, 1.5, mat('#d6cfbf'), land.x, land.y, land.z)
  platform.rotation.y = rotationY
  platform.position.addScaledVector(heading, -0.9)

  const a = land.clone().setY(land.y + HEIGHT)
  const b = sea.clone().setY(sea.y + HEIGHT)
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, a.distanceTo(b), 6), mat('#3a3f45', 0.5, 0.5))
  cable.position.copy(a).lerp(b, 0.5)
  cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  group.add(cable)

  const cabin = new THREE.Group()
  cabin.rotation.y = rotationY
  const red = mat('#c8102e', 0.5)
  box(cabin, 0.46, 0.2, 0.8, red, 0, -0.82, 0)
  box(cabin, 0.44, 0.22, 0.78, mat('#bfe3ea', 0.2, 0.3), 0, -0.62, 0)
  box(cabin, 0.5, 0.08, 0.84, red, 0, -0.4, 0)
  box(cabin, 0.05, 0.32, 0.05, mat('#3a3f45'), 0, -0.32, 0)
  box(cabin, 0.08, 0.06, 0.3, mat('#3a3f45'), 0, -0.03, 0)
  group.add(cabin)

  // Out, wait, back, wait
  const TRAVEL = 6
  const WAIT = 2
  const place = (t: number) => {
    const s = t % ((TRAVEL + WAIT) * 2)
    const out = ease(clamp01(s / TRAVEL))
    const back = ease(clamp01((s - TRAVEL - WAIT) / TRAVEL))
    const u = 0.06 + (out - back) * 0.88
    cabin.position.lerpVectors(a, b, u)
    cabin.rotation.z = Math.sin(t * 1.7) * 0.03
  }
  place(0)
  group.userData.tick = place
  return group
}
