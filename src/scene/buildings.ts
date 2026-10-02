import * as THREE from 'three'
import { box, cyl, dome, gable, glow, mat, sign, windowedBox } from './kit'
import { createSmoke } from './life'

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
  cyl(g, 0.04, 0.04, 0.5, white, 0, 3.5, 0, 8)
  door(g, 1.31, '#4a2f6b', 0.5, 0.8)
  sign(g, 'TSINGHUA', 1.6, 0.22, '#660874', '#ffffff', 0, 1.3, 1.33)
  return 4.1
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

const wework: Builder = (g) => {
  plinth(g, 2.8, 2)
  windowedBox(g, 2.8, 2.2, 2, '#22252b', '#a8dbe6', 0, 0.1, 0, 0.7)
  box(g, 2.9, 0.1, 2.1, mat('#c58b55'), 0, 2.3, 0) // timber roof deck
  // Roof terrace
  cyl(g, 0.03, 0.03, 0.7, dark, -0.7, 2.4, 0.2, 8)
  cyl(g, 0.02, 0.5, 0.18, mat('#f2c14e'), -0.7, 3.05, 0.2, 16)
  for (const [x, z] of [[0.5, 0.4], [0.9, -0.3]]) {
    box(g, 0.3, 0.2, 0.3, mat('#c58b55'), x, 2.4, z)
    box(g, 0.24, 0.22, 0.24, mat('#5f9e5a'), x, 2.6, z)
  }
  door(g, 1.01, '#c58b55', 0.6, 0.7)
  sign(g, 'wework', 1.3, 0.28, '#111111', '#ffffff', 0, 1, 1.02)
  return 3.4
}

const pico: Builder = (g) => {
  plinth(g, 2.8, 2.3)
  windowedBox(g, 2.8, 3.2, 2.3, '#eef1f5', '#3d6fd6', 0, 0.1, 0)
  box(g, 2.95, 0.14, 2.45, mat('#c9d2de'), 0, 3.3, 0)
  // A VR headset parked on the roof
  const headset = new THREE.Group()
  headset.position.set(0, 3.44, 0.1)
  g.add(headset)
  box(headset, 1.5, 0.62, 0.7, white, 0, 0.12, 0)
  box(headset, 1.4, 0.44, 0.1, mat('#16181d', 0.25, 0.4), 0, 0.21, 0.35)
  box(headset, 1.66, 0.16, 0.9, mat('#3a3d45'), 0, 0.35, -0.5)
  door(g, 1.16, '#27437f', 0.55, 0.75)
  sign(g, 'ByteDance · PICO', 2, 0.26, '#1c2a4a', '#ffffff', 0, 1, 1.17)
  return 4.4
}

const cornell: Builder = (g) => {
  plinth(g, 3.6, 2.4)
  windowedBox(g, 3.6, 1.5, 2.4, '#8d7a66', '#bfe3ea', 0, 0.1, 0, 0.6)
  // Residential tower behind
  windowedBox(g, 1.3, 4.2, 1.3, '#d9dde0', '#5b7f95', -1.05, 0.1, -0.45)
  box(g, 1.4, 0.1, 1.4, mat('#b8bfc5'), -1.05, 4.3, -0.45)
  // Solar canopy floating over the main hall
  for (const [x, z] of [[-1.7, 1.1], [1.7, 1.1], [1.7, -1.1]]) cyl(g, 0.04, 0.04, 0.6, dark, x, 1.6, z, 8)
  box(g, 4, 0.08, 2.8, mat('#2d3b4f', 0.3, 0.5), 0.2, 2.2, 0)
  door(g, 1.21, '#5b1010', 0.6, 0.75)
  sign(g, 'CORNELL TECH', 1.8, 0.24, '#b31b1b', '#ffffff', 0.4, 1, 1.22)
  return 4.6
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
  cyl(g, 0.03, 0.03, 0.9, mat('#c9ced6'), 0, 7.4, 0, 8)
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
  door(g, 1.41, '#25f4ee', 0.6, 0.8)
  sign(g, 'TikTok', 1.3, 0.34, '#000000', '#ffffff', 0, 1.02, 1.42)
  return 8.3
}

const builders: Record<string, Builder> = {
  tsinghua, factory, wework, pico, cornell, studio, echo3d, tiktok,
}

export function createBuilding(style: string): { group: THREE.Group; height: number } {
  const group = new THREE.Group()
  const build = builders[style]
  if (!build) throw new Error(`No builder for style "${style}"`)
  const height = build(group)
  return { group, height }
}
