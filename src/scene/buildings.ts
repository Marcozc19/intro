import * as THREE from 'three'
import { box, cyl, dome, gable, glow, logoPlate, mat, sign, windowedBox } from './kit'
import { createSmoke } from './life'
import {
  createBanner, createChartFacade, createFeedScreen, createHeadset, createHologramWorld, createNoteLogo, createStringLights,
} from './signature'

// One builder per place. Each draws into a group whose origin is the middle of
// the plot at ground level, with the front door facing +z, and returns the
// building's height (used to position its label and frame the camera).

type Builder = (g: THREE.Group) => number

const stone = mat('#d6cfbf')
const white = mat('#f4f1ea')
const dark = mat('#2b2e35')

/** Plinth that hides the gap between a flat building and sloping ground. */
function plinth(g: THREE.Group, w: number, d: number) {
  box(g, w + 0.4, 0.6, d + 0.4, stone, 0, -0.5, 0)
  box(g, 0.9, 0.12, 0.5, stone, 0, -0.02, d / 2 + 0.35) // doorstep
}

function door(g: THREE.Group, z: number, color = '#3a2c25', w = 0.42, h = 0.62) {
  box(g, w, h, 0.06, mat(color), 0, 0.1, z)
}

// The auditorium, with the university banner flying from the dome. (The
// Second Gate stands beside it; the world places that.)
const tsinghua: Builder = (g) => {
  plinth(g, 3.4, 2.6)
  box(g, 3.4, 1.7, 2.6, mat('#a9472f'), 0, 0.1, 0)
  windowedBox(g, 3.42, 1.0, 2.62, '#a9472f', '#f1e6c8', 0, 0.55, 0, 0.6)
  box(g, 3.6, 0.14, 2.8, white, 0, 1.8, 0)
  // Portico
  for (const x of [-0.75, -0.25, 0.25, 0.75]) cyl(g, 0.09, 0.1, 1.5, white, x, 0.1, 1.5, 14)
  box(g, 2, 0.14, 0.5, white, 0, 1.6, 1.45)
  gable(g, 0.5, 0.42, 2, white, 0, 1.74, 1.45).rotation.y = Math.PI / 2
  // Drum and dome
  cyl(g, 1.05, 1.05, 0.5, mat('#a9472f'), 0, 1.94, 0, 32)
  dome(g, 1.1, mat('#6f9288', 0.6, 0.2), 0, 2.44, 0)
  door(g, 1.31, '#3a2c25', 0.5, 0.8)
  // The university banner, flying from a tall pole on the dome
  cyl(g, 0.035, 0.04, 1.55, white, 0, 3.5, 0, 8)
  const banner = createBanner('logos/tsinghua-banner.png', 2.6, 1)
  banner.position.set(0.02, 4.5, 0)
  g.add(banner)
  return 5.25
}

const factory: Builder = (g) => {
  plinth(g, 3.2, 2.2)
  box(g, 3.2, 1.3, 2.2, mat('#dfe2e5'), 0, 0.1, 0)
  box(g, 3.22, 0.3, 2.22, mat('#ff6a13'), 0, 0.95, 0)
  for (const x of [-1.07, 0, 1.07]) {
    const tooth = gable(g, 2.2, 0.5, 1.06, mat('#aeb5bb', 0.6, 0.3), x, 1.4, 0)
    tooth.rotation.y = Math.PI / 2
  }
  cyl(g, 0.14, 0.18, 1.6, mat('#8d949b'), 1.2, 1.4, -0.7, 12)
  g.add(createSmoke(1.2, 3.05, -0.7))
  box(g, 1, 0.8, 0.06, dark, -0.7, 0.1, 1.11) // loading door
  // Robot arm on the forecourt
  const orange = mat('#ff6a13', 0.5)
  const arm = new THREE.Group()
  arm.position.set(1.05, 0.1, 1.75)
  g.add(arm)
  cyl(arm, 0.2, 0.24, 0.16, dark, 0, 0, 0)
  cyl(arm, 0.13, 0.13, 0.3, orange, 0, 0.16, 0)
  const lower = box(arm, 0.14, 0.75, 0.14, orange, -0.12, 0.38, 0)
  lower.rotation.z = 0.35
  const elbow = new THREE.Group()
  elbow.position.set(-0.25, 1.1, 0)
  elbow.rotation.z = 1.25
  arm.add(elbow)
  box(elbow, 0.11, 0.7, 0.11, orange, 0, 0, 0)
  box(elbow, 0.16, 0.1, 0.16, dark, 0, 0.7, 0)
  arm.userData.tick = (t: number) => {
    arm.rotation.y = Math.sin(t * 0.7) * 0.8
    elbow.rotation.z = 1.25 + Math.sin(t * 1.4) * 0.3
  }
  sign(g, 'KUKA', 1, 0.28, '#ff6a13', '#ffffff', 0.55, 0.5, 1.12)
  return 3
}

// A black steel frame with a glass lounge at street level. The floors above
// are the dashboard: on the front and back, the windows are a live bar chart.
const wework: Builder = (g) => {
  const steel = mat('#15171b', 0.6, 0.2)
  plinth(g, 3, 2.2)
  // Lounge: tall warm-lit glass between black posts
  box(g, 2.9, 0.78, 2.1, mat('#f3dcae', 0.5), 0, 0.1, 0)
  for (let i = 0; i <= 6; i++) {
    const x = -1.45 + (2.9 * i) / 6
    for (const z of [-1.06, 1.06]) box(g, 0.07, 0.78, 0.05, steel, x, 0.1, z)
  }
  for (const x of [-1.47, 1.47]) for (const z of [-0.53, 0, 0.53]) box(g, 0.05, 0.78, 0.07, steel, x, 0.1, z)
  box(g, 3, 0.12, 2.2, steel, 0, 0.88, 0)
  door(g, 1.08, '#2b2118', 0.5, 0.66)

  // Upper floors
  windowedBox(g, 2.9, 2.2, 2.1, '#15171b', '#55646f', 0, 1, 0, 0.6)
  for (const side of [1, -1]) {
    box(g, 2.9, 2.2, 0.05, steel, 0, 1, side * 1.06)
    const chart = createChartFacade(2.66, 2, 7, 6)
    chart.position.set(0, 1.1, side * 1.09)
    chart.rotation.y = side === 1 ? 0 : Math.PI
    g.add(chart)
  }

  // The name, large, standing along the front edge of the roof
  sign(g, 'wework', 2.5, 0.62, '#111111', '#ffffff', 0, 3.38, 1.02)
  for (const x of [-1, 1]) box(g, 0.06, 0.1, 0.06, steel, x, 3.3, 1.02)

  // Roof terrace: timber deck, umbrella, planters, a string of lights
  box(g, 3, 0.1, 2.2, mat('#c58b55'), 0, 3.2, 0)
  cyl(g, 0.03, 0.03, 0.7, steel, -0.75, 3.3, 0.25, 8)
  cyl(g, 0.02, 0.5, 0.18, mat('#f2c14e'), -0.75, 3.95, 0.25, 16)
  for (const [x, z] of [[0.55, 0.45], [0.95, -0.35]]) {
    box(g, 0.3, 0.2, 0.3, mat('#c58b55'), x, 3.3, z)
    box(g, 0.24, 0.22, 0.24, mat('#5f9e5a'), x, 3.5, z)
  }
  for (const x of [-1.38, 1.38]) cyl(g, 0.025, 0.025, 0.75, steel, x, 3.3, -0.92, 6)
  g.add(createStringLights(new THREE.Vector3(-1.38, 4.02, -0.92), new THREE.Vector3(1.38, 4.02, -0.92)))

  // Shanghai: a shared bike parked by the door
  const bike = new THREE.Group()
  bike.position.set(1.05, 0.1, 1.5)
  bike.rotation.y = 0.5
  g.add(bike)
  const teal = mat('#1fa3a8', 0.5)
  for (const z of [-0.2, 0.2]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 18), dark)
    wheel.position.set(0, 0.14, z)
    wheel.rotation.y = Math.PI / 2
    bike.add(wheel)
  }
  box(bike, 0.03, 0.03, 0.4, teal, 0, 0.2, 0)
  box(bike, 0.03, 0.2, 0.03, teal, 0, 0.2, -0.08)
  box(bike, 0.07, 0.03, 0.12, dark, 0, 0.4, -0.08)
  box(bike, 0.03, 0.24, 0.03, teal, 0, 0.14, 0.2)
  box(bike, 0.22, 0.03, 0.03, dark, 0, 0.38, 0.2)
  return 4.3
}

// ByteDance, where the work was on Pico Worlds: a VR headset rests on the
// roof and projects a hologram of a little world building itself.
const pico: Builder = (g) => {
  plinth(g, 2.8, 2.3)
  windowedBox(g, 2.8, 3.2, 2.3, '#eef1f5', '#3d6fd6', 0, 0.1, 0)
  box(g, 2.95, 0.14, 2.45, mat('#c9d2de'), 0, 3.3, 0)
  door(g, 1.16, '#27437f', 0.55, 0.75)
  // The company logo, centred along the top of the front (596 × 125 image)
  logoPlate(g, 2.3, 0.48, 'logos/bytedance.png', 'ByteDance', 0, 2.72, 1.17)

  // The headset rests on the roof, turned a little so the band shows, and
  // tipped back so its face looks up at the hologram
  const headset = createHeadset()
  headset.position.set(0.1, 4, 0.55)
  headset.rotation.set(-0.28, 0.3, 0, 'YXZ')
  headset.scale.setScalar(0.9)
  g.add(headset)
  const hologram = createHologramWorld()
  hologram.position.set(0.25, 5.5, 1)
  g.add(hologram)
  return 6.5
}

/** Dark photovoltaic panels with a fine grid, for the solar canopy. */
function solarTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1d2c44'
  ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = '#6f86a8'
  ctx.lineWidth = 3
  ctx.strokeRect(0, 0, 64, 64)
  ctx.lineWidth = 1
  ctx.strokeStyle = '#34496b'
  for (const k of [16, 32, 48]) {
    ctx.beginPath()
    ctx.moveTo(k, 0)
    ctx.lineTo(k, 64)
    ctx.moveTo(0, k)
    ctx.lineTo(64, k)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(9, 5)
  return tex
}

// The Roosevelt Island campus in miniature: the Bloomberg Center with its
// solar canopy in front, The House (the residential tower) and the angular
// glass Tata Innovation Center behind.
const cornell: Builder = (g) => {
  plinth(g, 4.6, 3.4)
  door(g, 1.61, '#5b1010', 0.6, 0.7)

  // Bloomberg Center: long and low, bronze-coloured metal, glass ground floor
  const BX = 0.4
  const BZ = 0.75
  windowedBox(g, 3.4, 1.5, 1.7, '#a38a69', '#e3eeee', BX, 0.1, BZ, 0.42)
  box(g, 3.42, 0.34, 1.72, mat('#35444f', 0.3, 0.3), BX, 0.1, BZ)
  box(g, 3.5, 0.08, 1.8, mat('#8a7458'), BX, 1.6, BZ)
  // The solar canopy floats over the whole roof on thin columns
  for (const [x, z] of [[-1.5, -0.25], [1.5, -0.25], [-1.5, 1.0], [1.5, 1.0]]) {
    cyl(g, 0.035, 0.035, 0.5, dark, BX + x, 1.68, BZ + z - 0.38, 8)
  }
  const pv = new THREE.MeshStandardMaterial({ map: solarTexture(), roughness: 0.3, metalness: 0.4 })
  const underside = mat('#c9ced2')
  box(g, 4, 0.07, 2.1, [underside, underside, pv, underside, underside, underside], BX, 2.18, BZ + 0.1)
  // Small, in the top right corner of the front. 552 × 190 image, so the plate keeps that shape.
  logoPlate(g, 1.02, 0.35, 'logos/cornell-tech.jpg', 'CORNELL TECH', BX + 1.1, 1.17, BZ + 0.87)

  // The House: a tall, slim tower with a dark louvred stripe up two faces
  const HX = -1.65
  const HZ = -0.95
  windowedBox(g, 1.05, 5.3, 1.05, '#c6ccd1', '#6f8a9c', HX, 0.1, HZ, 0.35)
  const louvre = mat('#39424c', 0.5, 0.2)
  box(g, 0.2, 5.1, 0.04, louvre, HX + 0.2, 0.2, HZ + 0.53)
  box(g, 0.04, 5.1, 0.2, louvre, HX - 0.53, 0.2, HZ - 0.15)
  box(g, 1.12, 0.12, 1.12, mat('#aab1b7'), HX, 5.4, HZ)
  box(g, 0.5, 0.25, 0.5, mat('#8f979e'), HX + 0.1, 5.52, HZ - 0.1)

  // Tata Innovation Center: glassy, with the upper floors cantilevered forward
  // (taller than the Bloomberg Center, so it shows above the canopy)
  const TX = 1.15
  const TZ = -1.1
  windowedBox(g, 1.8, 1.3, 1.2, '#dde4e9', '#4f9db8', TX, 0.1, TZ, 0.36)
  const upper = windowedBox(g, 2.1, 1.5, 1.3, '#dde4e9', '#4f9db8', TX + 0.1, 1.4, TZ + 0.2, 0.36)
  upper.rotation.y = -0.09
  box(g, 2.16, 0.07, 1.36, mat('#b9c2c9'), TX + 0.1, 2.9, TZ + 0.2).rotation.y = -0.09

  // New York: a yellow cab waiting out front, roof light glowing
  const cab = new THREE.Group()
  cab.position.set(-1.75, 0.1, 0.95)
  cab.rotation.y = 0.12
  g.add(cab)
  const yellow = mat('#f6c21a', 0.5)
  box(cab, 0.36, 0.15, 0.78, yellow, 0, 0.07, 0)
  box(cab, 0.33, 0.14, 0.4, mat('#2a323a', 0.3, 0.3), 0, 0.22, -0.04)
  box(cab, 0.34, 0.03, 0.42, yellow, 0, 0.36, -0.04)
  const roofLight = glow('#fff2b0', 1)
  box(cab, 0.16, 0.05, 0.07, roofLight, 0, 0.39, -0.04)
  for (const [x, z] of [[-0.18, 0.25], [0.18, 0.25], [-0.18, -0.25], [0.18, -0.25]]) {
    const wheel = cyl(cab, 0.07, 0.07, 0.05, dark, x, 0, z, 12)
    wheel.rotation.z = Math.PI / 2
    wheel.position.y = 0.07
  }
  cab.userData.tick = (t: number) => (roofLight.emissiveIntensity = 0.9 + Math.sin(t * 3) * 0.5)
  return 5.9
}

const studio: Builder = (g) => {
  plinth(g, 2.1, 1.9)
  windowedBox(g, 2.1, 1.6, 1.9, '#33363d', '#ffd27a', 0, 0.1, 0)
  box(g, 2.2, 0.1, 2, mat('#22242a'), 0, 1.7, 0)
  const cube = box(g, 0.5, 0.5, 0.5, glow('#9b8cff', 0.9), 0, 2.15, 0)
  cube.rotation.set(0.6, 0.6, 0)
  cube.userData.spin = 0.5
  door(g, 0.96, '#ffd27a', 0.42, 0.62)
  sign(g, '4149', 0.9, 0.28, '#111318', '#ffd27a', 0, 0.95, 0.97)
  return 2.9
}

const echo3d: Builder = (g) => {
  plinth(g, 2.2, 1.9)
  windowedBox(g, 2.2, 1.7, 1.9, '#f3f1fb', '#6c4cf1', 0, 0.1, 0)
  box(g, 2.3, 0.12, 2, mat('#6c4cf1'), 0, 1.8, 0)
  // A floating 3D asset, slowly turning
  const asset = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({ color: '#6c4cf1', flatShading: true, roughness: 0.35 }),
  )
  asset.position.set(0, 2.6, 0)
  asset.castShadow = true
  asset.userData.spin = 0.8
  asset.userData.bob = 0.08
  g.add(asset)
  door(g, 0.96, '#3b2a8c', 0.45, 0.7)
  sign(g, 'echo3D', 1, 0.28, '#6c4cf1', '#ffffff', 0, 1, 0.97)
  return 3.2
}

const tiktok: Builder = (g) => {
  plinth(g, 2.8, 2.8)
  windowedBox(g, 2.8, 1.4, 2.8, '#1b1c21', '#3a4656', 0, 0.1, 0, 0.6) // podium
  windowedBox(g, 2.1, 4.6, 2.1, '#15161a', '#33415a', 0, 1.5, 0, 0.5)
  windowedBox(g, 1.5, 1.2, 1.5, '#15161a', '#33415a', 0, 6.1, 0, 0.5)
  box(g, 1.6, 0.1, 1.6, dark, 0, 7.3, 0)
  // The two brand colours run up opposite corners
  const cyan = glow('#25f4ee', 0.9)
  const red = glow('#fe2c55', 0.9)
  box(g, 0.1, 4.6, 0.1, cyan, -1.05, 1.5, 1.05)
  box(g, 0.1, 4.6, 0.1, red, 1.05, 1.5, -1.05)
  box(g, 0.1, 4.6, 0.1, red, 1.05, 1.5, 1.05)
  box(g, 0.1, 4.6, 0.1, cyan, -1.05, 1.5, -1.05)
  g.userData.tick = (t: number) => {
    cyan.emissiveIntensity = 0.9 + Math.sin(t * 2) * 0.5
    red.emissiveIntensity = 0.9 - Math.sin(t * 2) * 0.5
  }
  // The note logo, turning slowly on the roof so it reads from every side
  const logo = createNoteLogo(cyan, red)
  logo.position.y = 7.5
  logo.userData.spin = 0.5
  cyl(g, 0.22, 0.26, 0.1, dark, 0, 7.4, 0, 20)
  g.add(logo)
  // The feed, on a phone-shaped screen up the front of the tower
  const feed = createFeedScreen(1.15, 2.3)
  feed.position.set(0, 4.1, 1.09)
  g.add(feed)
  door(g, 1.41, '#25f4ee', 0.6, 0.8)
  sign(g, 'TikTok', 1.3, 0.34, '#000000', '#ffffff', 0, 1.02, 1.42)
  return 9.1
}

const builders: Record<string, Builder> = {
  tsinghua, factory, wework, pico, cornell, studio, echo3d, tiktok,
}

/** `clearings` are spots around the building (in its own coordinates) that trees should keep off. */
export function createBuilding(style: string): { group: THREE.Group; height: number; clearings: [number, number][] } {
  const group = new THREE.Group()
  const build = builders[style]
  if (!build) throw new Error(`No builder for style "${style}"`)
  const height = build(group)
  return { group, height, clearings: group.userData.clearings ?? [] }
}
