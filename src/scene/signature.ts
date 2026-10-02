import * as THREE from 'three'
import { box, cyl, glow, mat } from './kit'
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

// ── TikTok: plugs flying in and docking (the developer platform) ────────────

/**
 * Sockets on a wall facing +x, each with a plug that flies in, snaps on,
 * stays connected for a while, then leaves.
 */
export function createPlugs(heights: number[], colors: string[]): THREE.Group {
  const g = new THREE.Group()
  const CYCLE = 7
  const plugs = heights.map((y, i) => {
    const light = glow(colors[i % colors.length], 0.2)
    box(g, 0.04, 0.34, 0.34, mat('#2a2d34'), 0.02, y - 0.17, 0)
    box(g, 0.05, 0.2, 0.2, light, 0.03, y - 0.1, 0)
    const plug = new THREE.Group()
    box(plug, 0.3, 0.3, 0.3, mat(colors[i % colors.length], 0.5), 0.2, -0.15, 0)
    box(plug, 0.14, 0.05, 0.05, mat('#d9dde0', 0.3, 0.8), 0.02, 0.04, 0.07)
    box(plug, 0.14, 0.05, 0.05, mat('#d9dde0', 0.3, 0.8), 0.02, 0.04, -0.07)
    g.add(plug)
    return { plug, light, y, away: new THREE.Vector3(3.2, y + 1.4, i % 2 === 0 ? 1.6 : -1.6), offset: i / heights.length }
  })
  const docked = new THREE.Vector3()
  const place = (t: number) => {
    for (const p of plugs) {
      const phase = (t / CYCLE + p.offset) % 1
      docked.set(0.06, p.y, 0)
      const arrive = ease(clamp01(phase / 0.3))
      const leave = clamp01((phase - 0.85) / 0.15)
      p.plug.position.lerpVectors(p.away, docked, arrive)
      // A little squash as it snaps home
      const snap = phase > 0.3 && phase < 0.4 ? 1 + Math.sin(((phase - 0.3) / 0.1) * Math.PI) * 0.25 : 1
      p.plug.scale.setScalar(Math.min(1, phase * 12) * (1 - leave) * snap)
      p.light.emissiveIntensity = phase > 0.3 && phase < 0.85 ? 1.6 : 0.2
    }
  }
  place(0)
  g.userData.tick = place
  return g
}

// ── Cornell Tech: papers circling, a few picked out as recommendations ──────

export function createPapers(count = 10, radius = 0.85): THREE.Group {
  const g = new THREE.Group()
  const sheet = new THREE.PlaneGeometry(0.3, 0.4)
  const papers = Array.from({ length: count }, (_, i) => {
    const material = new THREE.MeshStandardMaterial({
      color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.9,
    })
    const mesh = new THREE.Mesh(sheet, material)
    mesh.castShadow = true
    g.add(mesh)
    return { mesh, material, angle: (i / count) * Math.PI * 2, lift: 0 }
  })
  const PICK = 1.8 // seconds each recommendation stays lit
  const place = (t: number, dt = 0) => {
    const picked = (Math.floor(t / PICK) * 7) % count
    papers.forEach((p, i) => {
      const on = i === picked || i === (picked + 4) % count ? 1 : 0
      p.lift += (on - p.lift) * Math.min(1, dt * 6)
      const a = p.angle + t * 0.5
      p.mesh.position.set(Math.cos(a) * radius, Math.sin(t * 1.3 + i) * 0.08 + p.lift * 0.45, Math.sin(a) * radius)
      p.mesh.rotation.set(0.25, -a + Math.PI / 2, Math.sin(t * 2 + i) * 0.15)
      p.mesh.scale.setScalar(1 + p.lift * 0.5)
      // Unlit papers keep a faint white glow so they read against the dark roof
      p.material.emissive.set(p.lift > 0.3 ? '#ffc21a' : '#ffffff')
      p.material.emissiveIntensity = 0.35 + p.lift * 1.1
    })
  }
  place(0)
  g.userData.tick = place
  return g
}

// ── Cornell Tech: the Roosevelt Island tram ─────────────────────────────────

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

  // The far stop: a little islet
  const islet = new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 12), mat('#ead9a6', 1))
  islet.position.set(sea.x, -0.25, sea.z)
  islet.scale.y = 0.4
  islet.receiveShadow = true
  const turf = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 12), mat('#86b96a', 1))
  turf.position.set(sea.x, 0, sea.z)
  turf.scale.y = 0.36
  group.add(islet, turf)

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
