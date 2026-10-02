import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { places, projects } from '../data'
import { createBuilding } from './buildings'
import { BALLOON, BRIDGE, CAMPUS_GATE, createPaths, plots } from './layout'
import { createBirds, createDriftingClouds, createSailboat } from './life'
import { createBalloon, createBridge, createCloudBank, createDock, createProjectCloud, createTrees, SKY_Y } from './props'
import { createTram, createTsinghuaGate } from './signature'
import { createRiverFlow, createSeabed, createTerrain, createWater, groundHeight, ISLAND_R, riverX } from './terrain'

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
  onPickBalloon(): void
  onPickNothing(): void
  /** The visitor dragged away from a focused building: close its panel. */
  onRelease(): void
}

const BG = '#e9f3f2'
const BUILDING_SCALE = 1.3
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function createWorld(canvas: HTMLCanvasElement, labelsEl: HTMLElement, hazeEl: HTMLElement, events: Events) {
  // ── Renderer, scene, lights ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BG)
  const fog = new THREE.Fog(BG, 85, 165)
  scene.fog = fog

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
  scene.add(createTerrain(), createSeabed(), createWater(), createRiverFlow(), createDock())
  scene.add(createBridge(BRIDGE.west, BRIDGE.east, BRIDGE.z))

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

  const sites = plots(places)
  const clearings: THREE.Vector2[] = []
  const paths = createPaths(places, sites)
  scene.add(paths.mesh)
  places.forEach((place, i) => {
    const built = createBuilding(place.style)
    const group = built.group
    const height = built.height * BUILDING_SCALE
    const site = sites[i]
    group.position.copy(site.position)
    group.rotation.y = site.rotationY
    scene.add(group)
    const front = new THREE.Vector3(Math.sin(site.rotationY), 0, Math.cos(site.rotationY))
    // Frame the building together with anything laid out in front of it.
    const fore = (group.userData.forecourt ?? 0) * BUILDING_SCALE
    const target = site.position.clone().addScaledVector(front, fore * 0.42).setY(site.position.y + height * (fore ? 0.28 : 0.45))
    // Look down fairly steeply, so a row of buildings in front doesn't hide this one.
    const pos = target.clone().addScaledVector(front, 9 + height * 0.9 + fore * 0.45).setY(target.y + 8.5 + height * 0.35 + fore * 0.45)
    // Lawns and plazas that belong to the building, in world coordinates
    group.updateMatrixWorld()
    for (const [cx, cz] of built.clearings) {
      const p = group.localToWorld(new THREE.Vector3(cx * BUILDING_SCALE, 0, cz * BUILDING_SCALE))
      clearings.push(new THREE.Vector2(p.x, p.z))
    }
    addItem(place.id, 'ground', place.short ?? place.name, group,
      site.position.clone().setY(site.position.y + height + 0.7), { pos, target }, BUILDING_SCALE, 0.5 + i * 0.16)
  })

  // Cornell Tech's tram: a station on the building's seaward side, heading out to sea.
  const keepClear: THREE.Vector2[] = [new THREE.Vector2(BRIDGE.west - 0.5, BRIDGE.z), new THREE.Vector2(BRIDGE.east + 0.5, BRIDGE.z)]
  const campus = places.findIndex((p) => p.style === 'cornell')
  if (campus >= 0) {
    const site = sites[campus]
    const left = new THREE.Vector3(-Math.cos(site.rotationY), 0, Math.sin(site.rotationY))
    const station = site.position.clone().addScaledVector(left, 4.3)
    scene.add(createTram(station, new THREE.Vector3(station.x, 0, station.z).normalize()))
    keepClear.push(new THREE.Vector2(station.x, station.z))
  }
  keepClear.push(new THREE.Vector2(BALLOON.x, BALLOON.z))
  // Tsinghua's gate stands on the lawn at the front left of its building, at an
  // angle to it. Clicking it selects Tsinghua.
  const gateOwner = places.find((p) => p.style === 'tsinghua')
  if (gateOwner) {
    const gate = createTsinghuaGate()
    gate.position.set(CAMPUS_GATE.x, groundHeight(CAMPUS_GATE.x, CAMPUS_GATE.z), CAMPUS_GATE.z)
    gate.rotation.y = CAMPUS_GATE.rotationY
    gate.scale.setScalar(CAMPUS_GATE.scale)
    gate.userData.pick = gateOwner.id
    pickables.push(gate)
    scene.add(gate)
    // Keep trees off the gate and the lawn in front of it
    const across = new THREE.Vector2(Math.cos(CAMPUS_GATE.rotationY), -Math.sin(CAMPUS_GATE.rotationY))
    const ahead = new THREE.Vector2(Math.sin(CAMPUS_GATE.rotationY), Math.cos(CAMPUS_GATE.rotationY))
    for (const along of [-1.4, 0, 1.4]) {
      for (const out of [0, 1.6]) {
        keepClear.push(new THREE.Vector2(CAMPUS_GATE.x, CAMPUS_GATE.z).addScaledVector(across, along).addScaledVector(ahead, out))
      }
    }
  }
  const riverBanks: THREE.Vector2[] = []
  for (let z = -ISLAND_R; z <= ISLAND_R; z += 0.8) riverBanks.push(new THREE.Vector2(riverX(z), z))

  scene.add(createTrees([
    { points: paths.points.filter((_, i) => i % 2 === 0), radius: 1.2 },
    { points: sites.map((s) => new THREE.Vector2(s.position.x, s.position.z)), radius: 3.4 },
    { points: riverBanks, radius: 2.5 },
    { points: keepClear, radius: 2.4 },
    { points: clearings, radius: 2 },
  ]))

  // The hot air balloon is the only way up. It waits at the far end of
  // downtown and carries the view above the clouds when clicked.
  const balloon = createBalloon()
  balloon.userData.pick = 'balloon'
  pickables.push(balloon)
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.14, 28), new THREE.MeshStandardMaterial({ color: '#d6cfbf' }))
  pad.position.set(BALLOON.x, groundHeight(BALLOON.x, BALLOON.z) + 0.02, BALLOON.z)
  pad.receiveShadow = true
  balloon.position.set(BALLOON.x, 0, BALLOON.z)
  const BALLOON_LOW = groundHeight(BALLOON.x, BALLOON.z) + 0.1
  const BALLOON_HIGH = SKY_Y + 0.5
  const CLIMB = 4.6 // seconds for the ride, and for the camera that follows it
  let altitude = 0 // 0 on the island, 1 above the clouds
  let balloonHover = 0
  const balloonLabel = document.createElement('button')
  balloonLabel.className = 'label balloon-label'
  balloonLabel.addEventListener('click', () => events.onPickBalloon())
  labelsEl.append(balloonLabel)
  scene.add(balloon, pad, createCloudBank(BALLOON.x, BALLOON.z), createSailboat(), createBirds(), createDriftingClouds())

  // Ideas sit on the cloud deck in an arc in front of where the balloon comes up.
  projects.forEach((project, i) => {
    const angle = THREE.MathUtils.degToRad(145 - ((i + 0.5) / projects.length) * 110)
    const p = new THREE.Vector3(0.5 + Math.cos(angle) * 9, SKY_Y, -4 + Math.sin(angle) * 9)
    const cloud = createProjectCloud(project.color, 100 + i)
    cloud.position.copy(p)
    scene.add(cloud)
    const target = p.clone().setY(SKY_Y + 0.6)
    const pos = target.clone().add(new THREE.Vector3(0, 3.4, 8.5))
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
  controls.autoRotateSpeed = 0.35
  controls.autoRotate = !reducedMotion
  const stopAutoRotate = () => (controls.autoRotate = false)
  canvas.addEventListener('pointerdown', stopAutoRotate, { once: true })
  canvas.addEventListener('wheel', stopAutoRotate, { once: true, passive: true })

  let level: Level = 'ground'
  let aspect = 1

  function overview(l: Level): Pose {
    const target = l === 'ground' ? new THREE.Vector3(0, 2.5, 0) : new THREE.Vector3(0.5, SKY_Y, -1)
    const offset = l === 'ground' ? new THREE.Vector3(0, 26, 50) : new THREE.Vector3(0, 13, 27)
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
  let recentring = false
  /** Drop the focused item without flying anywhere; the pivot glides back to the centre. */
  function release() {
    selected = null
    shiftGoal = 0.13
    recentring = true
    labelsEl.classList.remove('has-selection')
    for (const it of items) it.label.classList.remove('selected')
    events.onRelease()
  }

  function focus(id: string | null, toLevel: Level = level) {
    recentring = false
    const item = id ? items.find((it) => it.id === id) : undefined
    const nextLevel = item ? item.level : toLevel
    const climbing = nextLevel !== level
    let to = item ? item.pose : overview(nextLevel)
    if (item && aspect < 1) {
      // Portrait screens see a narrower slice, so stand further back.
      to = { target: to.target, pos: to.target.clone().lerp(to.pos, 1.7) }
    }
    const mid: Pose | undefined = climbing
      ? { pos: new THREE.Vector3(BALLOON.x * 0.5, SKY_Y * 0.5, BALLOON.z + 26), target: new THREE.Vector3(BALLOON.x, SKY_Y * 0.5, BALLOON.z) }
      : undefined
    fly(to, climbing ? CLIMB : 1.3, mid)
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
    if (id === 'balloon') return id
    return items.find((it) => it.id === id)?.level === level ? id : null
  }

  canvas.addEventListener('pointermove', (e) => {
    // Dragging always turns the view about the middle of the island (or of
    // the clouds). If a building is focused, a drag lets go of it.
    if (downAt && selected && !tween && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) release()
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
    if (id === 'balloon') events.onPickBalloon()
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
    if (recentring && !tween) {
      // Glide the pivot back to the centre. The zoom level and viewing direction
      // stay exactly as the visitor left them.
      const home = overview(level).target
      const away = camera.position.clone().sub(controls.target)
      controls.target.lerp(home, Math.min(1, dt * 3))
      camera.position.copy(controls.target).add(away)
      if (controls.target.distanceTo(home) < 0.03) recentring = false
    }
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

    // Balloon: rise or sink towards the current level, in step with the camera
    const goal = level === 'sky' ? 1 : 0
    const stepAlt = reducedMotion ? 1 : dt / CLIMB
    altitude = goal > altitude ? Math.min(goal, altitude + stepAlt) : Math.max(goal, altitude - stepAlt)
    const lifted = ease(altitude)
    const afloat = reducedMotion ? 0 : Math.sin(elapsed * 0.9) * 0.15 * lifted
    balloon.position.y = BALLOON_LOW + (BALLOON_HIGH - BALLOON_LOW) * lifted + afloat
    balloon.rotation.y = lifted * 1.2 + (reducedMotion ? 0 : Math.sin(elapsed * 0.3) * 0.08)
    balloonHover += ((hovered === 'balloon' ? 1 : 0) - balloonHover) * Math.min(1, dt * 10)
    balloon.scale.setScalar(1.2 * (1 + balloonHover * 0.05))
    const riding = altitude > 0.02 && altitude < 0.98
    balloonLabel.textContent = level === 'sky' ? 'Back to the island ↓' : 'Ride up to my ideas ↑'
    balloonLabel.classList.toggle('hover', hovered === 'balloon')
    projected.set(BALLOON.x, balloon.position.y + 8.2, BALLOON.z).project(camera)
    balloonLabel.style.display = riding || projected.z >= 1 || selected ? 'none' : ''
    balloonLabel.style.transform =
      `translate(-50%, -100%) translate(${((projected.x * 0.5 + 0.5) * size.x).toFixed(1)}px, ${((-projected.y * 0.5 + 0.5) * size.y).toFixed(1)}px)`

    // Camera limits. On the island the camera may tilt towards a top-down
    // view, but never climbs above the cloud deck: the steeper it looks (or the
    // higher it gets), the more cloud drifts across the view.
    let haze = 0
    if (level === 'ground') {
      const dist = camera.position.distanceTo(controls.target)
      const ceiling = Math.acos(Math.min(1, (SKY_Y - 12 - controls.target.y) / dist))
      controls.minPolarAngle = Math.max(0.3, ceiling)
      controls.maxPolarAngle = 1.45
      if (altitude === 0 && !tween) {
        const steep = smooth(0.72, 0.36, controls.getPolarAngle())
        const high = smooth(SKY_Y - 26, SKY_Y - 12, camera.position.y)
        haze = Math.max(steep, high) * 0.92
      }
    } else {
      controls.minPolarAngle = 0.6
      controls.maxPolarAngle = 1.3
    }
    hazeEl.style.opacity = haze.toFixed(3)
    hazeEl.style.backdropFilter = haze > 0.01 ? `blur(${(haze * 10).toFixed(1)}px)` : 'none'
    // The ride passes through cloud: fog closes in on everything except the
    // balloon (its materials ignore fog), then thins out again at the other end.
    const inCloud = smooth(0.08, 0.5, altitude) * (1 - smooth(0.55, 0.95, altitude))
    fog.near = 85 + (4 - 85) * inCloud
    fog.far = 165 + (34 - 165) * inCloud
    document.body.classList.toggle('under-clouds', level === 'ground' && !riding)

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
