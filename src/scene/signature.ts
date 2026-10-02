import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { box, cyl, glow, mat, rng } from './kit'
import { puffGeo } from './props'
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

// ── Tsinghua: the flag and the gate ─────────────────────────────────────────

/**
 * A white banner carrying the image at `file` (under public/), flying from a
 * pole at the origin towards +x and rippling in the wind. The image is
 * printed the right way round on both sides.
 */
export function createBanner(file: string, w: number, h: number): THREE.Group {
  const g = new THREE.Group()
  const geo = new THREE.PlaneGeometry(w, h, 16, 1)
  geo.translate(w / 2, 0, 0)

  // The image has a transparent background, so it is printed onto white cloth
  // here, at a higher resolution than the file so its edges stay smooth.
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = Math.round((1024 * h) / w)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  const front = new THREE.CanvasTexture(c)
  const back = new THREE.CanvasTexture(c)
  back.wrapS = THREE.RepeatWrapping
  back.repeat.x = -1 // mirrored, so it reads correctly from behind
  back.offset.x = 1
  for (const tex of [front, back]) {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
  }
  const image = new Image()
  image.onload = () => {
    const scale = Math.min((c.width * 0.9) / image.width, (c.height * 0.82) / image.height)
    const iw = image.width * scale
    const ih = image.height * scale
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih)
    front.needsUpdate = back.needsUpdate = true
  }
  image.src = import.meta.env.BASE_URL + file

  for (const [map, side] of [[front, THREE.FrontSide], [back, THREE.BackSide]] as const) {
    const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, side, roughness: 0.85 }))
    cloth.castShadow = side === THREE.FrontSide
    g.add(cloth)
  }
  const pos = geo.attributes.position
  g.userData.tick = (t: number) => {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      pos.setZ(i, Math.sin(x * 3.2 - t * 3.6) * 0.1 * (x / w))
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  }
  return g
}

/** A slab of wall, `depth` thick, cut from an outline with an arched opening through it. */
function archedWall(outline: THREE.Shape, opening: { x: number; w: number; spring: number }, depth: number, material: THREE.Material) {
  const r = opening.w / 2
  const hole = new THREE.Path()
  // The opening starts a hair above the ground so it stays inside the outline.
  hole.moveTo(opening.x - r, 0.015)
  hole.lineTo(opening.x - r, opening.spring)
  hole.absarc(opening.x, opening.spring, r, Math.PI, 0, true)
  hole.lineTo(opening.x + r, 0.015)
  hole.closePath()
  outline.holes.push(hole)
  const geo = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: 20 })
  geo.translate(0, 0, -depth / 2)
  const mesh = new THREE.Mesh(geo, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/**
 * The Second Gate (二校门): white marble, a tall arch between paired columns
 * on stone pedestals with brick piers behind, a stepped parapet with the
 * 清華園 plaque, and a lower arched wing swept up to it on either side.
 * Origin is the middle of the gate at ground level; it faces +z.
 */
export function createTsinghuaGate(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'tsinghua-gate'
  const marble = mat('#f4f1ea', 0.7)
  const brick = mat('#8f6f5b')
  const stone = mat('#b8b2a7')

  // Centre: the main arch
  const centre = new THREE.Shape()
  centre.moveTo(-0.46, 0)
  centre.lineTo(0.46, 0)
  centre.lineTo(0.46, 1.58)
  centre.lineTo(-0.46, 1.58)
  centre.closePath()
  g.add(archedWall(centre, { x: 0, w: 0.64, spring: 0.98 }, 0.3, marble))

  for (const side of [-1, 1]) {
    const x = side * 0.68
    // Pier: stone pedestal, brick behind, a pair of columns in front
    box(g, 0.46, 0.5, 0.52, stone, x, 0, 0)
    box(g, 0.42, 1.08, 0.34, brick, x, 0.5, -0.04)
    for (const dx of [-0.11, 0.11]) {
      cyl(g, 0.058, 0.066, 1, marble, x + dx, 0.5, 0.17, 14)
      box(g, 0.16, 0.06, 0.16, marble, x + dx, 1.5, 0.17)
    }
    box(g, 0.2, 0.14, 0.02, brick, x, 1.64, 0.21) // brick panel in the frieze

    // Wing: a lower wall with a small arch, its top swept up towards the centre
    const wing = new THREE.Shape()
    wing.moveTo(0, 0)
    wing.lineTo(0.78, 0)
    wing.lineTo(0.78, 0.92)
    wing.quadraticCurveTo(0.3, 0.95, 0, 1.42)
    wing.closePath()
    const wall = archedWall(wing, { x: 0.44, w: 0.3, spring: 0.46 }, 0.22, marble)
    wall.position.x = side * 0.9
    wall.scale.x = side
    g.add(wall)
    // End pier with a carved scroll on top
    const end = side * 1.8
    box(g, 0.26, 0.74, 0.34, brick, end, 0, 0)
    box(g, 0.32, 0.1, 0.4, marble, end, 0.74, 0)
    box(g, 0.24, 0.2, 0.3, marble, end, 0.84, 0)
    const scroll = cyl(g, 0.1, 0.1, 0.24, marble, end - side * 0.16, 0.96, 0, 16)
    scroll.rotation.x = Math.PI / 2
  }

  // Entablature, cornice and the stepped parapet
  box(g, 1.86, 0.24, 0.4, marble, 0, 1.58, 0)
  box(g, 2.08, 0.07, 0.6, marble, 0, 1.82, 0)
  box(g, 1.7, 0.18, 0.36, marble, 0, 1.89, 0)
  box(g, 0.98, 0.1, 0.34, marble, 0, 2.07, 0)
  for (const x of [-0.72, 0.72]) box(g, 0.3, 0.3, 0.4, marble, x, 1.89, 0)
  cyl(g, 0.012, 0.016, 0.95, mat('#6d6f73', 0.4, 0.6), 0, 2.17, 0, 8)

  // The plaque. It reads right to left, as on the gate itself.
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#f7f5ef'
  ctx.fillRect(0, 0, 512, 128)
  ctx.fillStyle = '#2b2622'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 88px "Kaiti SC", "STKaiti", "Songti SC", "Noto Serif CJK SC", serif'
  ;['園', '華', '清'].forEach((ch, i) => ctx.fillText(ch, 96 + i * 160, 68))
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.195), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }))
  plaque.position.set(0, 1.7, 0.205)
  g.add(plaque)
  return g
}

// ── ByteDance · Pico: a VR headset projecting a world being built ───────────

/**
 * The outline of a VR visor seen from the front: a wide rounded shape with a
 * notch in the bottom edge for the nose. Centred on the origin.
 */
function visorOutline(w: number, h: number): THREE.Shape {
  const x = w / 2
  const y = h / 2
  const r = h * 0.34 // corner radius
  const s = new THREE.Shape()
  s.moveTo(-x + r, y)
  s.lineTo(x - r, y)
  s.quadraticCurveTo(x, y, x, y - r)
  s.lineTo(x, -y + r)
  s.quadraticCurveTo(x, -y, x - r, -y)
  // Nose notch
  s.lineTo(w * 0.17, -y)
  s.bezierCurveTo(w * 0.1, -y, w * 0.09, -y + h * 0.36, 0, -y + h * 0.36)
  s.bezierCurveTo(-w * 0.09, -y + h * 0.36, -w * 0.1, -y, -w * 0.17, -y)
  s.lineTo(-x + r, -y)
  s.quadraticCurveTo(-x, -y, -x, -y + r)
  s.lineTo(-x, y - r)
  s.quadraticCurveTo(-x, y, -x + r, y)
  return s
}

/**
 * A standalone VR headset. The visor is a deep white goggle with a nose notch,
 * a glossy black face and four tracking cameras; inside are the face cushion
 * and two lenses. A wide band runs from each side round the back of the head
 * to a padded cradle, and another band goes over the top. It faces +z and its
 * origin is the middle of the visor.
 */
export function createHeadset(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'headset'
  const shell = mat('#f4f5f7', 0.45)
  const gloss = mat('#0d0f13', 0.12, 0.6)
  const pad = mat('#30343b', 0.9)
  const band = mat('#dfe2e7', 0.7)
  const add = (geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    g.add(mesh)
    return mesh
  }
  const W = 1.7
  const H = 0.86
  const DEPTH = 0.6
  // Visor: the goggle shape pushed back into a deep, soft-edged body
  const body = new THREE.ExtrudeGeometry(visorOutline(W, H), {
    depth: DEPTH, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 16,
  })
  body.translate(0, 0, -DEPTH / 2)
  add(body, shell)
  // Black glass face, the same shape a little smaller, standing just proud of the body
  const face = new THREE.ExtrudeGeometry(visorOutline(W * 0.9, H * 0.82), { depth: 0.04, bevelEnabled: false, curveSegments: 16 })
  add(face, gloss, 0, 0.02, DEPTH / 2 + 0.035)
  // Tracking cameras near the corners of the face
  for (const x of [-0.6, 0.6]) {
    for (const y of [-0.17, 0.23]) {
      const camera = add(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 14), mat('#6b7480', 0.3, 0.7), x, y, DEPTH / 2 + 0.08)
      camera.rotation.x = Math.PI / 2
    }
  }
  // Inside: the cushion that sits against the face, and the two lenses
  const cushion = new THREE.ExtrudeGeometry(visorOutline(W * 0.92, H * 0.88), { depth: 0.14, bevelEnabled: false, curveSegments: 16 })
  add(cushion, pad, 0, 0, -DEPTH / 2 - 0.18)
  for (const x of [-0.36, 0.36]) {
    const lens = add(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 28), mat('#27406a', 0.08, 0.8), x, 0.06, -DEPTH / 2 - 0.19)
    lens.rotation.x = Math.PI / 2
    add(new THREE.TorusGeometry(0.23, 0.03, 8, 28), mat('#111318', 0.5), x, 0.06, -DEPTH / 2 - 0.2)
  }

  // Head band: a wide loop from the sides of the visor round the back of the head
  const BACK = 1.75 // how far behind the visor the band reaches
  const loop = add(new THREE.TorusGeometry(W / 2 - 0.04, 0.055, 10, 48, Math.PI), band, 0, 0.04, -DEPTH / 2 + 0.05)
  loop.rotation.x = -Math.PI / 2 // lay it flat, curving away behind the visor
  loop.scale.set(1, (BACK - 0.1) / (W / 2 - 0.04), 2.6) // deep enough for a head, and wide like a strap
  // Padded cradle at the back of the head
  add(new RoundedBoxGeometry(0.78, 0.46, 0.2, 4, 0.09), shell, 0, 0.04, -DEPTH / 2 - BACK + 0.02)
  add(new RoundedBoxGeometry(0.64, 0.34, 0.08, 3, 0.04), pad, 0, 0.04, -DEPTH / 2 - BACK + 0.14)
  // Band over the top of the head, from the visor to the cradle
  const span = BACK - 0.05
  const over = add(new THREE.TorusGeometry(span / 2, 0.035, 8, 32, Math.PI), band, 0, H / 2 - 0.06, -DEPTH / 2 - span / 2)
  over.rotation.y = Math.PI / 2
  over.scale.set(1, 0.72, 3.2)
  return g
}

/**
 * A hologram of a little world that builds itself: a disc of ground appears,
 * then blocks pop up on it one by one, it turns for a moment, and it dissolves.
 * Each time round a different world is built. Origin is the centre of the disc.
 */
export function createHologramWorld(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hologram'
  const CYAN = '#2fd0ee'
  // Light, not paint: see-through, and unaffected by the scene's sun and shadows.
  // (Plain transparency, not additive glow, which washes out against the pale sky.)
  const light = (opacity: number) =>
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide })
  const world = new THREE.Group()
  g.add(world)

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 0.07, 28), light(0.5))
  world.add(ground)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.012, 6, 40), light(0.9))
  ring.rotation.x = Math.PI / 2
  world.add(ring)

  const COUNT = 9
  const unit = new THREE.BoxGeometry(1, 1, 1)
  unit.translate(0, 0.5, 0) // grow upwards from the ground
  const edges = new THREE.EdgesGeometry(unit)
  const roof = new THREE.ConeGeometry(0.75, 1, 4)
  roof.rotateY(Math.PI / 4)
  roof.translate(0, 0.5, 0)
  const blocks = Array.from({ length: COUNT }, () => {
    const body = new THREE.Mesh(unit, light(0.42))
    const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#0b93b8', transparent: true, depthWrite: false }))
    const cap = new THREE.Mesh(roof, light(0.5))
    const block = new THREE.Group()
    block.add(body, outline, cap)
    world.add(block)
    return { block, cap }
  })

  // The beam the headset throws up to the hologram
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.12, 1, 24, 1, true), light(0.16))
  beam.position.y = -0.56
  g.add(beam)

  const CYCLE = 10
  const BUILD = 0.7 // seconds between blocks
  let laidOut = -1
  /** A fresh arrangement of blocks for each world. */
  function layout(cycle: number) {
    const rand = rng(7000 + cycle)
    const cells: [number, number][] = []
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) cells.push([x, z])
    cells.sort(() => rand() - 0.5)
    blocks.forEach(({ block, cap }, i) => {
      const [cx, cz] = cells[i]
      const w = 0.2 + rand() * 0.14
      const h = 0.18 + rand() * 0.5
      block.position.set(cx * 0.38 + (rand() - 0.5) * 0.06, 0.035, cz * 0.38 + (rand() - 0.5) * 0.06)
      block.userData.size = [w, h, w]
      // Some blocks are towers with flat tops, some are houses with a pitched roof
      cap.visible = rand() < 0.45
      cap.position.y = 1
      cap.scale.set(1, 0.35 / h, 1)
    })
  }
  const place = (t: number) => {
    const cycle = Math.floor(t / CYCLE)
    if (cycle !== laidOut) {
      layout(cycle)
      laidOut = cycle
    }
    const s = t - cycle * CYCLE
    const dissolve = 1 - clamp01((s - (CYCLE - 0.9)) / 0.7)
    const appear = clamp01(s / 0.6)
    world.rotation.y = t * 0.35
    world.scale.setScalar(appear)
    blocks.forEach(({ block }, i) => {
      const grow = clamp01((s - 0.8 - i * BUILD) / 0.45)
      // Pop up with a little overshoot, and sink away at the end
      const pop = grow === 0 ? 0 : 1 + 2.70158 * Math.pow(grow - 1, 3) + 1.70158 * Math.pow(grow - 1, 2)
      const [w, h, d] = block.userData.size as [number, number, number]
      block.visible = grow > 0 && dissolve > 0
      block.scale.set(w, Math.max(0.001, h * pop * dissolve), d)
    })
    const flicker = 0.85 + Math.sin(t * 23) * 0.06 + Math.sin(t * 57) * 0.04
    ;(ground.material as THREE.MeshBasicMaterial).opacity = 0.5 * flicker * dissolve
    ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * flicker * dissolve
    ;(beam.material as THREE.MeshBasicMaterial).opacity = 0.16 * flicker * (0.4 + 0.6 * dissolve)
  }
  place(0)
  g.userData.tick = place
  return g
}

// ── echo3D: a model goes up to the cloud and comes back lighter ─────────────

/**
 * A heavy, finely meshed 3D model rises into a small cloud; the cloud works on
 * it; a clean, simple version of the same shape comes back down. Each round
 * uses a different shape. Origin is the roof the models leave from.
 */
export function createCloudPipeline(navy: string, sky: string): THREE.Group {
  const g = new THREE.Group()
  const CLOUD_Y = 1.75
  const cloud = new THREE.Group()
  cloud.position.y = CLOUD_Y
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: sky, emissiveIntensity: 0.12 })
  for (const [x, y, z, r] of [[0, 0, 0, 0.42], [-0.42, -0.06, 0.05, 0.3], [0.44, -0.05, -0.04, 0.32], [0.14, 0.16, 0.1, 0.3], [-0.2, 0.1, -0.14, 0.27]]) {
    const puff = new THREE.Mesh(puffGeo, cloudMat)
    puff.position.set(x, y, z)
    puff.scale.set(r, r * 0.75, r)
    cloud.add(puff)
  }
  g.add(cloud)

  // Each pair is the same object before and after: dense mesh, then tidy mesh.
  const pairs: [THREE.BufferGeometry, THREE.BufferGeometry][] = [
    [new THREE.TorusKnotGeometry(0.2, 0.07, 72, 10), new THREE.TorusGeometry(0.22, 0.09, 6, 9)],
    [new THREE.IcosahedronGeometry(0.3, 4), new THREE.IcosahedronGeometry(0.3, 0)],
    [new THREE.BoxGeometry(0.42, 0.42, 0.42, 7, 7, 7), new THREE.BoxGeometry(0.42, 0.42, 0.42)],
  ]
  const heavyMat = new THREE.MeshStandardMaterial({ color: navy, roughness: 0.6 })
  const wireMat = new THREE.LineBasicMaterial({ color: '#cfe9ff' })
  const lightMat = new THREE.MeshStandardMaterial({ color: sky, flatShading: true, roughness: 0.35 })
  const heavy = new THREE.Group() // on its way up
  const light = new THREE.Group() // on its way down
  g.add(heavy, light)
  const models = pairs.map(([dense, tidy]) => {
    const up = new THREE.Group()
    up.add(new THREE.Mesh(dense, heavyMat), new THREE.LineSegments(new THREE.WireframeGeometry(dense), wireMat))
    const down = new THREE.Mesh(tidy, lightMat)
    down.castShadow = true
    heavy.add(up)
    light.add(down)
    return { up, down }
  })

  const CYCLE = 6.5
  const place = (t: number) => {
    const round = Math.floor(t / CYCLE)
    const s = t - round * CYCLE
    models.forEach((m, i) => {
      const mine = i === round % models.length
      m.up.visible = mine
      m.down.visible = mine
    })
    // Up: leave the roof, climb, vanish into the cloud
    const rise = clamp01((s - 0.2) / 2)
    heavy.position.y = 0.35 + ease(rise) * (CLOUD_Y - 0.35)
    heavy.scale.setScalar(Math.min(1, s / 0.3) * (1 - clamp01((rise - 0.8) / 0.2)))
    heavy.rotation.set(t * 0.9, t * 1.3, 0)
    // The cloud swells while it works on the model
    const working = clamp01((s - 2.1) / 0.4) * (1 - clamp01((s - 3.4) / 0.4))
    cloud.scale.setScalar(1 + working * (0.12 + Math.sin(t * 14) * 0.04))
    // Down: the tidy version drops out of the cloud and settles on the roof
    const fall = clamp01((s - 3.5) / 2)
    light.position.y = CLOUD_Y - ease(fall) * (CLOUD_Y - 0.4)
    light.scale.setScalar(clamp01(fall / 0.2) * (1 - clamp01((s - 6) / 0.4)))
    light.rotation.y = t * 1.1
  }
  place(0)
  g.userData.tick = place
  return g
}

// ── 4149: an AI teammate sitting in on the meeting ──────────────────────────

/** A speech bubble or note drawn on a canvas, as a texture for a sprite. */
function cardTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * The meeting itself: speech bubbles pop up over each of the three people in
 * turn, then a note rises from the AI teammate with three items on it, and
 * each one gets ticked. `seats` are where the people sit; `ai` is the orb.
 */
export function createMeeting(seats: THREE.Vector3[], ai: THREE.Vector3, pink: string): THREE.Group {
  const g = new THREE.Group()
  const bubbleTex = cardTexture(128, 112, (ctx) => {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(4, 4, 120, 78, 22)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(40, 78)
    ctx.lineTo(52, 108)
    ctx.lineTo(70, 78)
    ctx.fill()
    ctx.fillStyle = '#9aa3ad'
    ctx.fillRect(22, 26, 84, 9)
    ctx.fillRect(22, 46, 58, 9)
  })
  const bubbles = seats.map((seat) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false }))
    sprite.center.set(0.4, 0)
    sprite.position.copy(seat).add(new THREE.Vector3(0, 0.42, 0))
    g.add(sprite)
    return sprite
  })
  // The note, drawn once for each number of ticks
  const notes = [0, 1, 2, 3].map((ticks) =>
    cardTexture(160, 200, (ctx) => {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(4, 4, 152, 192, 18)
      ctx.fill()
      ctx.fillStyle = pink
      ctx.beginPath()
      ctx.roundRect(4, 4, 152, 34, [18, 18, 0, 0])
      ctx.fill()
      for (let i = 0; i < 3; i++) {
        const y = 70 + i * 44
        ctx.strokeStyle = pink
        ctx.lineWidth = 5
        ctx.strokeRect(20, y - 13, 26, 26)
        ctx.fillStyle = '#b8bfc7'
        ctx.fillRect(60, y - 5, 76, 10)
        if (i < ticks) {
          ctx.lineWidth = 7
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(24, y)
          ctx.lineTo(32, y + 8)
          ctx.lineTo(46, y - 12)
          ctx.stroke()
        }
      }
    }),
  )
  const noteMat = new THREE.SpriteMaterial({ map: notes[0], transparent: true, depthWrite: false })
  const note = new THREE.Sprite(noteMat)
  note.center.set(0.5, 0)
  g.add(note)

  const CYCLE = 9.5
  const pop = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2))
  const place = (t: number) => {
    const s = t % CYCLE
    bubbles.forEach((b, i) => {
      const from = 0.3 + i * 0.85
      const k = pop((s - from) / 0.3) * (1 - clamp01((s - from - 1.5) / 0.25))
      b.scale.set(0.5 * k, 0.44 * k, 1)
      b.visible = k > 0.01
    })
    // The note rises from the AI, gets its ticks, holds, and fades
    const rise = ease(clamp01((s - 3.4) / 0.8))
    const ticks = Math.min(3, Math.max(0, Math.floor((s - 4.5) / 0.65) + 1))
    const map = notes[s < 4.5 ? 0 : ticks]
    if (noteMat.map !== map) noteMat.map = map
    const gone = clamp01((s - 8.6) / 0.6)
    note.position.copy(ai).add(new THREE.Vector3(0, 0.25 + rise * 0.75, 0))
    const size = pop((s - 3.4) / 0.4) * (1 - gone)
    note.scale.set(0.56 * size, 0.7 * size, 1)
    note.visible = size > 0.01
  }
  place(0)
  g.userData.tick = place
  return g
}

// ── WeWork: the facade as a live bar chart (business intelligence) ──────────

/**
 * A grid of window panes facing +z, `w` wide and `h` tall. Each column is a
 * bar: its windows light from the bottom up to the bar's value, and every few
 * seconds the values change and the bars slide to their new heights.
 */
export function createChartFacade(w: number, h: number, columns = 7, rows = 6): THREE.InstancedMesh {
  const GAP = 0.07
  const cw = w / columns
  const ch = h / rows
  const panes = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(cw - GAP, ch - GAP),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    columns * rows,
  )
  const m = new THREE.Object3D()
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < rows; r++) {
      m.position.set(-w / 2 + cw * (c + 0.5), ch * (r + 0.5), 0)
      m.updateMatrix()
      panes.setMatrixAt(c * rows + r, m.matrix)
    }
  }
  const DARK = new THREE.Color('#27303a')
  const LIT = new THREE.Color('#ffd98a')
  const PEAK = new THREE.Color('#ff8f5a') // the tallest bar stands out
  const color = new THREE.Color()
  const PERIOD = 3.2
  /** Bar heights (in rows) for one refresh of the dashboard. */
  const values = (step: number) => {
    const rand = rng(4200 + step)
    return Array.from({ length: columns }, () => 1 + rand() * (rows - 1))
  }
  const place = (t: number) => {
    const step = Math.floor(t / PERIOD)
    const from = values(step)
    const to = values(step + 1)
    // Hold, then glide to the next values over the last third of the period
    const k = ease(clamp01((t / PERIOD - step - 0.62) / 0.38))
    const bars = from.map((v, i) => v + (to[i] - v) * k)
    const tallest = bars.indexOf(Math.max(...bars))
    for (let c = 0; c < columns; c++) {
      for (let r = 0; r < rows; r++) {
        const fill = clamp01(bars[c] - r) // 1 = fully lit, a fraction = the bar's leading edge
        color.copy(DARK).lerp(c === tallest ? PEAK : LIT, fill)
        panes.setColorAt(c * rows + r, color)
      }
    }
    panes.instanceColor!.needsUpdate = true
  }
  place(0)
  panes.userData.tick = place
  return panes
}

/** A string of small lights between two points, sagging in the middle and twinkling. */
export function createStringLights(from: THREE.Vector3, to: THREE.Vector3, count = 9): THREE.Group {
  const g = new THREE.Group()
  const bulbs = Array.from({ length: count }, (_, i) => {
    const u = i / (count - 1)
    const material = glow('#ffe3a3', 1)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), material)
    bulb.position.lerpVectors(from, to, u).setY(from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * 0.22)
    g.add(bulb)
    return material
  })
  g.userData.tick = (t: number) => bulbs.forEach((b, i) => (b.emissiveIntensity = 1.1 + Math.sin(t * 2.2 + i * 1.7) * 0.5))
  return g
}

// ── WeWork: Shanghai across the water ───────────────────────────────────────

/**
 * Lujiazui in miniature: the Oriental Pearl Tower on the waterfront, with the
 * Shanghai Tower, the World Financial Center (the "bottle opener") and Jin Mao
 * behind it, and a handful of lower blocks. The waterfront faces +z.
 */
export function createPudong(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'pudong'
  const GROUND = 0.48
  const shore = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), mat('#ead9a6', 1))
  shore.scale.set(3.9, 0.75, 3.2)
  shore.position.y = -0.22
  const streets = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), mat('#c9cdd0', 1))
  streets.scale.set(3.5, 0.7, 2.8)
  streets.position.y = -0.14
  g.add(shore, streets)
  // Riverside park along the waterfront
  box(g, 3.6, 0.05, 0.7, mat('#7fb56a', 1), 0, GROUND + 0.01, 1.75)

  // Oriental Pearl Tower: spheres strung on columns, on three slanting legs
  const pearl = new THREE.Group()
  pearl.position.set(-1.2, GROUND, 1.2)
  g.add(pearl)
  const concrete = mat('#d9dde0')
  const pink = mat('#c6557f', 0.3, 0.3)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    cyl(pearl, 0.05, 0.05, 1.5, concrete, Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14, 8)
    const leg = cyl(pearl, 0.045, 0.06, 1.25, concrete, Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, 8)
    leg.rotation.set(Math.sin(a) * -0.5, 0, Math.cos(a) * 0.5)
    leg.position.set(Math.cos(a) * 0.42, 0.52, Math.sin(a) * 0.42)
  }
  const ball = (r: number, y: number) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), pink)
    s.position.y = y
    s.castShadow = true
    pearl.add(s)
  }
  ball(0.36, 1.35)
  cyl(pearl, 0.09, 0.11, 1.25, concrete, 0, 1.6, 0, 12)
  ball(0.27, 2.95)
  cyl(pearl, 0.05, 0.07, 0.4, concrete, 0, 3.15, 0, 10)
  ball(0.11, 3.6)
  cyl(pearl, 0.012, 0.03, 0.9, mat('#c9ced6', 0.3, 0.7), 0, 3.68, 0, 8)

  // Shanghai Tower: a tapering glass spiral, the tallest of the three
  const spiral = mat('#a9d2de', 0.2, 0.5)
  for (let i = 0; i < 9; i++) {
    const seg = cyl(g, 0.4 - (i + 1) * 0.026, 0.4 - i * 0.026, 0.56, spiral, 1.05, GROUND + i * 0.56, -0.5, 5)
    seg.rotation.y = i * 0.3
  }
  // World Financial Center: a slim blade with the opening at the top
  const blade = mat('#587f9c', 0.25, 0.5)
  box(g, 0.56, 3.3, 0.5, blade, 2.05, GROUND, 0.35)
  for (const x of [-0.21, 0.21]) box(g, 0.14, 0.62, 0.5, blade, 2.05 + x, GROUND + 3.3, 0.35)
  box(g, 0.56, 0.13, 0.5, blade, 2.05, GROUND + 3.92, 0.35)
  // Jin Mao: a tiered tower with a spire
  const tiers = mat('#b3bcc3', 0.35, 0.5)
  let y = GROUND
  for (const [size, tall] of [[0.62, 1.1], [0.52, 0.8], [0.42, 0.6], [0.32, 0.45], [0.2, 0.3]]) {
    box(g, size, tall, size, tiers, 0.2, y, 0.75)
    y += tall
  }
  cyl(g, 0.01, 0.04, 0.6, tiers, 0.2, y, 0.75, 8)

  // Lower blocks behind and around
  const rand = rng(88)
  const spots: [number, number][] = [
    [-2.3, 0.2], [-1.9, -0.9], [-1, -1.5], [-0.2, -0.6], [-0.4, -1.8], [0.4, -1.6], [1.7, -1.4],
    [2.4, -0.6], [-0.5, 0.3], [2.7, 0.9], [-2.6, -0.5], [1.2, 1.3],
  ]
  const palette = ['#c3bbad', '#9aa6b0', '#6f97ad', '#d8d2c4', '#a9b7c0', '#8d9aa5']
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), spots.length)
  const m = new THREE.Object3D()
  const color = new THREE.Color()
  spots.forEach(([x, z], i) => {
    const h = 0.7 + rand() * 1.3
    m.position.set(x, GROUND - 0.15 + h / 2, z)
    m.scale.set(0.48 + rand() * 0.16, h + 0.3, 0.46 + rand() * 0.14)
    m.updateMatrix()
    blocks.setMatrixAt(i, m.matrix)
    blocks.setColorAt(i, color.set(palette[Math.floor(rand() * palette.length)]))
  })
  g.add(blocks)
  return g
}

/** A small ferry shuttling between two points on the water, pausing at each end. */
export function createFerry(a: THREE.Vector3, b: THREE.Vector3): THREE.Group {
  const boat = new THREE.Group()
  boat.name = 'ferry'
  box(boat, 0.62, 0.22, 1.5, mat('#f3efe2'), 0, -0.04, 0)
  box(boat, 0.64, 0.07, 1.52, mat('#2f7d5b'), 0, 0.06, 0)
  box(boat, 0.5, 0.26, 0.9, mat('#f3efe2'), 0, 0.18, -0.05)
  box(boat, 0.52, 0.1, 0.92, mat('#35444f', 0.3, 0.3), 0, 0.26, -0.05)
  box(boat, 0.56, 0.04, 0.98, mat('#2f7d5b'), 0, 0.44, -0.05)
  cyl(boat, 0.06, 0.07, 0.24, mat('#d9843a'), 0, 0.48, -0.25, 10)
  boat.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
  const TRAVEL = 7
  const WAIT = 2.5
  const place = (t: number) => {
    const s = (t + 4) % ((TRAVEL + WAIT) * 2)
    const out = ease(clamp01(s / TRAVEL))
    const back = ease(clamp01((s - TRAVEL - WAIT) / TRAVEL))
    // Sits low enough that the hull is in the water, not on top of it
    boat.position.lerpVectors(a, b, out - back).setY(-0.06 + Math.sin(t * 1.4) * 0.025)
  }
  place(0)
  boat.userData.tick = place
  // No shadow: cast onto the water it reads as the boat hovering above it.
  boat.traverse((o) => (o.castShadow = false))
  return boat
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
