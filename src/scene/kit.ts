import * as THREE from 'three'

// Small building blocks shared by everything in the scene. All helpers take the
// y of the object's *base*, so shapes can be stacked without half-height maths.

const materials = new Map<string, THREE.MeshStandardMaterial>()

export function mat(color: string, roughness = 0.85, metalness = 0): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}`
  let m = materials.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materials.set(key, m)
  }
  return m
}

export function glow(color: string, intensity = 1.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 })
}

function place<T extends THREE.Mesh>(parent: THREE.Object3D, mesh: T, x: number, y: number, z: number): T {
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function box(
  parent: THREE.Object3D, w: number, h: number, d: number,
  material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0,
) {
  return place(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y + h / 2, z)
}

export function cyl(
  parent: THREE.Object3D, rTop: number, rBottom: number, h: number,
  material: THREE.Material, x = 0, y = 0, z = 0, segments = 20,
) {
  return place(parent, new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material), x, y + h / 2, z)
}

/** Four-sided pyramid whose base is w × d. */
export function pyramid(
  parent: THREE.Object3D, w: number, h: number, d: number,
  material: THREE.Material, x = 0, y = 0, z = 0,
) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4)
  g.rotateY(Math.PI / 4)
  const m = place(parent, new THREE.Mesh(g, material), x, y + h / 2, z)
  m.scale.set(w, h, d)
  return m
}

/** Triangular prism (a gable roof): ridge runs along x, base is w × d. */
export function gable(
  parent: THREE.Object3D, w: number, h: number, d: number,
  material: THREE.Material, x = 0, y = 0, z = 0,
) {
  const shape = new THREE.Shape()
  shape.moveTo(-d / 2, 0)
  shape.lineTo(d / 2, 0)
  shape.lineTo(0, h)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false })
  g.translate(0, 0, -w / 2)
  g.rotateY(Math.PI / 2)
  return place(parent, new THREE.Mesh(g, material), x, y, z)
}

export function dome(parent: THREE.Object3D, r: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const g = new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  return place(parent, new THREE.Mesh(g, material), x, y, z)
}

// ── Window walls ────────────────────────────────────────────────────────────

const windowCanvases = new Map<string, HTMLCanvasElement>()

function windowCanvas(wall: string, glass: string): HTMLCanvasElement {
  const key = `${wall}|${glass}`
  let c = windowCanvases.get(key)
  if (!c) {
    c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = wall
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillRect(14, 12, 36, 40)
    ctx.fillStyle = glass
    ctx.fillRect(17, 15, 30, 34)
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillRect(17, 15, 30, 9)
    windowCanvases.set(key, c)
  }
  return c
}

function windowMaterial(wall: string, glass: string, across: number, up: number) {
  const tex = new THREE.CanvasTexture(windowCanvas(wall, glass))
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(Math.max(1, Math.round(across)), Math.max(1, Math.round(up)))
  tex.anisotropy = 4
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })
}

/** A box whose four walls carry a grid of windows. */
export function windowedBox(
  parent: THREE.Object3D, w: number, h: number, d: number,
  wall: string, glass = '#8fc3dc', x = 0, y = 0, z = 0, cell = 0.55,
) {
  const floors = h / (cell * 1.1)
  const sideX = windowMaterial(wall, glass, d / cell, floors)
  const sideZ = windowMaterial(wall, glass, w / cell, floors)
  const plain = mat(wall)
  return box(parent, w, h, d, [sideX, sideX, plain, plain, sideZ, sideZ], x, y, z)
}

// ── Signs ───────────────────────────────────────────────────────────────────

/** A flat name board facing +z. */
export function sign(
  parent: THREE.Object3D, text: string, w: number, h: number,
  bg: string, fg: string, x = 0, y = 0, z = 0,
) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = Math.max(32, Math.round((512 * h) / w))
  const ctx = c.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, c.width, c.height)
  let size = c.height * 0.62
  ctx.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`
  const fit = (c.width * 0.88) / ctx.measureText(text).width
  if (fit < 1) size *= fit
  ctx.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, c.width / 2, c.height / 2 + size * 0.04)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const board = box(parent, w, h, 0.05, [
    mat(bg), mat(bg), mat(bg), mat(bg),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), mat(bg),
  ], x, y, z)
  board.castShadow = false
  return board
}

// ── Deterministic randomness ────────────────────────────────────────────────

export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
