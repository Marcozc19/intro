import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { places, projects } from '../data'
import { createBuilding } from './buildings'
import { createPath, pathPoints, plots } from './layout'
import { createBirds, createDriftingClouds, createSailboat } from './life'
import { createCloudBank, createDock, createLadder, createProjectCloud, createTrees, SKY_Y } from './props'
import { createTram } from './signature'
import { createSeabed, createTerrain, createWater } from './terrain'

export type Level = 'ground' | 'sky'

type Pose = { pos: THREE.Vector3; target: THREE.Vector3 }

type Item = {
  id: string
  level: Level
  object: THREE.Object3D
  anchor: THREE.Vector3 // where the floating label sits
  pose: Pose // camera pose when focused
  label: HTMLButtonElement
  baseScale: number
  hover: number
  appearAt: number // seconds after load when it pops up
}

type Events = {
  onPick(id: string): void
  onPickLadder(): void
  onPickNothing(): void
}

const BG = '#e9f3f2'
const BUILDING_SCALE = 1.3
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function createWorld(canvas: HTMLCanvasElement, labelsEl: HTMLElement, events: Events) {
  // ── Renderer, scene, lights ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BG)
  scene.fog = new THREE.Fog(BG, 85, 165)

  scene.add(new THREE.HemisphereLight('#ffffff', '#b7d6c4', 1.5))
  const sun = new THREE.DirectionalLight('#fff3dd', 2.6)
  sun.position.set(-20, 34, 18)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -24
  sun.shadow.camera.right = sun.shadow.camera.top = 24
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 100
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.04
  scene.add(sun)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400)

  // ── World ─────────────────────────────────────────────────────────────────
  scene.add(createTerrain(), createSeabed(), createWater(), createPath(), createDock())

  const items: Item[] = []
  const pickables: THREE.Object3D[] = []

  function addItem(
    id: string, level: Level, name: string, object: THREE.Object3D,
    anchor: THREE.Vector3, pose: Pose, baseScale = 1, appearAt = 0,
  ) {
    const label = document.createElement('button')
    label.className = 'label'
    label.textContent = name
    label.dataset.level = level
    label.addEventListener('click', () => events.onPick(id))
    labelsEl.append(label)
    object.userData.pick = id
    pickables.push(object)
    items.push({ id, level, object, anchor, pose, label, baseScale, hover: 0, appearAt: reducedMotion ? 0 : appearAt })
  }

  const sites = plots(places.length)
  places.forEach((place, i) => {
    const built = createBuilding(place.style)
    const group = built.group
    const height = built.height * BUILDING_SCALE
    const site = sites[i]
    group.position.copy(site.position)
    group.rotation.y = site.rotationY
    scene.add(group)
    const front = new THREE.Vector3(Math.sin(site.rotationY), 0, Math.cos(site.rotationY))
    const target = site.position.clone().setY(site.position.y + height * 0.45)
    const pos = target.clone().addScaledVector(front, 12 + height).setY(target.y + 6 + height * 0.35)
    addItem(place.id, 'ground', place.short ?? place.name, group,
      site.position.clone().setY(site.position.y + height + 0.7), { pos, target }, BUILDING_SCALE, 0.5 + i * 0.16)
  })

  // Cornell Tech's tram runs from beside the campus out over the water.
  const campus = places.findIndex((p) => p.style === 'cornell')
  const tram = campus >= 0 ? createTram(sites[campus]) : null
  if (tram) scene.add(tram.group)

  scene.add(createTrees([
    { points: pathPoints().filter((_, i) => i % 3 === 0), radius: 1.2 },
    { points: sites.map((s) => new THREE.Vector2(s.position.x, s.position.z)), radius: 3.4 },
    { points: tram?.keepClear ?? [], radius: 1.8 },
  ]))

  const ladder = createLadder()
  ladder.userData.pick = 'ladder'
  ladder.scale.set(1.5, 1, 1.5)
  pickables.push(ladder)
  scene.add(ladder, createCloudBank(), createSailboat(), createBirds(), createDriftingClouds())

  projects.forEach((project, i) => {
    const angle = Math.PI / 2 + (i - (projects.length - 1) / 2) * 0.95
    const p = new THREE.Vector3(Math.cos(angle) * 7.2, SKY_Y, Math.sin(angle) * 7.2)
    const cloud = createProjectCloud(project.color, 100 + i)
    cloud.position.copy(p)
    scene.add(cloud)
    const out = new THREE.Vector3(p.x, 0, p.z).normalize()
    const target = p.clone().setY(SKY_Y + 0.6)
    const pos = target.clone().addScaledVector(out, 8.5).setY(SKY_Y + 4)
    addItem(project.id, 'sky', project.name, cloud, p.clone().setY(SKY_Y + 2.3), { pos, target })
  })

  // Ambient motion: things that spin or bob, plus anything with its own tick.
  const animated: { object: THREE.Object3D; baseY: number; phase: number }[] = []
  const tickers: ((time: number, dt: number) => void)[] = []
  scene.traverse((o) => {
    if (o.userData.spin || o.userData.bob) animated.push({ object: o, baseY: o.position.y, phase: animated.length * 1.7 })
    if (o.userData.tick) tickers.push(o.userData.tick)
  })
  // Buildings pop up one after another, with a little overshoot.
  const popUp = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2)

  // ── Camera rig ────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 8
  controls.maxDistance = 95
  controls.minPolarAngle = 0.75
  controls.maxPolarAngle = 1.45
  controls.autoRotateSpeed = 0.35
  controls.autoRotate = !reducedMotion
  const stopAutoRotate = () => (controls.autoRotate = false)
  canvas.addEventListener('pointerdown', stopAutoRotate, { once: true })
  canvas.addEventListener('wheel', stopAutoRotate, { once: true, passive: true })

  let level: Level = 'ground'
  let aspect = 1

  function overview(l: Level): Pose {
    const target = l === 'ground' ? new THREE.Vector3(0, 2.5, 0) : new THREE.Vector3(0, SKY_Y, 1.5)
    const offset = l === 'ground' ? new THREE.Vector3(0, 25, 48) : new THREE.Vector3(0, 11, 21)
    // Pull back on narrow screens so the whole island still fits.
    offset.multiplyScalar(Math.max(1, 1.35 / aspect))
    return { pos: target.clone().add(offset), target }
  }

  type Tween = { t: number; dur: number; from: Pose; to: Pose; mid?: Pose }
  let tween: Tween | null = null

  function fly(to: Pose, dur: number, mid?: Pose) {
    controls.autoRotate = false
    if (reducedMotion) dur = 0
    tween = { t: 0, dur, from: { pos: camera.position.clone(), target: controls.target.clone() }, to, mid }
    controls.enabled = false
  }

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  function along(out: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3, mid: THREE.Vector3 | undefined, e: number) {
    if (!mid) return out.lerpVectors(from, to, e)
    a.lerpVectors(from, mid, e)
    b.lerpVectors(mid, to, e)
    return out.lerpVectors(a, b, e)
  }

  function stepTween(dt: number) {
    if (!tween) return
    tween.t = tween.dur === 0 ? 1 : Math.min(1, tween.t + dt / tween.dur)
    const e = ease(tween.t)
    along(camera.position, tween.from.pos, tween.to.pos, tween.mid?.pos, e)
    along(controls.target, tween.from.target, tween.to.target, tween.mid?.target, e)
    camera.lookAt(controls.target)
    if (tween.t === 1) {
      tween = null
      controls.enabled = true
    }
  }

  // The scene is nudged sideways to leave room for the page text or the panel.
  let shift = 0.13
  let shiftGoal = 0.13
  let lift = 0
  let selected: string | null = null

  /** Fly to an item, or back to the overview of a level when id is null. */
  function focus(id: string | null, toLevel: Level = level) {
    const item = id ? items.find((it) => it.id === id) : undefined
    const nextLevel = item ? item.level : toLevel
    const climbing = nextLevel !== level
    let to = item ? item.pose : overview(nextLevel)
    if (item && aspect < 1) {
      // Portrait screens see a narrower slice, so stand further back.
      to = { target: to.target, pos: to.target.clone().lerp(to.pos, 1.7) }
    }
    const mid: Pose | undefined = climbing
      ? { pos: new THREE.Vector3(0, SKY_Y * 0.62, 21), target: new THREE.Vector3(0, SKY_Y * 0.55, 0) }
      : undefined
    fly(to, climbing ? 2.6 : 1.3, mid)
    level = nextLevel
    selected = item ? item.id : null
    shiftGoal = item ? -0.14 : 0.13
    labelsEl.dataset.level = level
    labelsEl.classList.toggle('has-selection', !!item)
    for (const it of items) it.label.classList.toggle('selected', it.id === selected)
  }

  // ── Pointer interaction ───────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let hovered: string | null = null
  let downAt: { x: number; y: number } | null = null

  function pickAt(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect()
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(pickables, true)[0]
    let o: THREE.Object3D | null = hit?.object ?? null
    while (o && !o.userData.pick) o = o.parent
    const id: string | null = o ? o.userData.pick : null
    if (!id) return null
    if (id === 'ladder') return id
    return items.find((it) => it.id === id)?.level === level ? id : null
  }

  canvas.addEventListener('pointermove', (e) => {
    hovered = downAt ? null : pickAt(e.clientX, e.clientY)
    canvas.style.cursor = hovered ? 'pointer' : 'grab'
  })
  canvas.addEventListener('pointerleave', () => (hovered = null))
  canvas.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }))
  canvas.addEventListener('pointerup', (e) => {
    const moved = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : Infinity
    downAt = null
    if (moved > 6) return
    const id = pickAt(e.clientX, e.clientY)
    if (id === 'ladder') events.onPickLadder()
    else if (id) events.onPick(id)
    else events.onPickNothing()
  })

  // ── Frame loop ────────────────────────────────────────────────────────────
  const size = new THREE.Vector2()
  const projected = new THREE.Vector3()

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (size.x === w && size.y === h) return
    size.set(w, h)
    renderer.setSize(w, h, false)
    aspect = w / h
    camera.aspect = aspect
    if (!tween && !selected) {
      const o = overview(level)
      camera.position.copy(o.pos)
      controls.target.copy(o.target)
    }
  }

  const timer = new THREE.Timer()
  let elapsed = 0

  function frame() {
    timer.update()
    tick(Math.min(timer.getDelta(), 0.1)) // capped, so returning to the tab doesn't jump
  }

  function tick(dt: number) {
    elapsed += dt
    resize()

    stepTween(dt)
    if (!tween) controls.update()

    // Wide screens shift sideways; narrow ones lift the scene above the bottom sheet.
    const wide = size.x > 900
    const k = Math.min(1, dt * 4)
    shift += ((wide ? shiftGoal : 0) - shift) * k
    lift += ((!wide && selected ? 0.24 : 0) - lift) * k
    camera.setViewOffset(size.x, size.y, -shift * size.x, lift * size.y, size.x, size.y)

    if (!reducedMotion) {
      for (const it of animated) {
        const { spin, bob } = it.object.userData
        if (spin) it.object.rotation.y += spin * dt
        if (bob) it.object.position.y = it.baseY + Math.sin(elapsed * 1.2 + it.phase) * bob
      }
      for (const run of tickers) run(elapsed, dt)
    }

    for (const it of items) {
      const on = it.id === hovered || it.id === selected ? 1 : 0
      it.hover += (on - it.hover) * Math.min(1, dt * 10)
      const appear = Math.min(1, Math.max(0, (elapsed - it.appearAt) / 0.7))
      it.object.visible = appear > 0
      it.object.scale.setScalar(it.baseScale * (1 + it.hover * 0.06) * (appear < 1 ? popUp(appear) : 1))
      it.label.classList.toggle('hover', it.id === hovered)
      projected.copy(it.anchor).project(camera)
      const visible = projected.z < 1 && it.level === level && appear > 0.6
      it.label.style.display = visible ? '' : 'none'
      if (visible) {
        const x = (projected.x * 0.5 + 0.5) * size.x
        const y = (-projected.y * 0.5 + 0.5) * size.y
        it.label.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      }
    }

    renderer.render(scene, camera)
  }

  resize()
  labelsEl.dataset.level = level
  if (import.meta.env.DEV) {
    // Lets tests step time by hand: __scene.advance(2) runs two seconds of frames.
    const advance = (seconds: number) => {
      for (let i = 0; i < seconds * 60; i++) tick(1 / 60)
    }
    Object.assign(window, { __scene: { camera, controls, items, advance, state: () => ({ tween, level, selected, shift }) } })
  }
  renderer.setAnimationLoop(frame)

  return {
    focus,
    get level() {
      return level
    },
  }
}
