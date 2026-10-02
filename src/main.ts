import './style.css'
import { places, profile, projects, type Place, type Project, type Role } from './data'
import { createWorld, type Level } from './scene/world'

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!

const panel = $('#panel')
const panelBody = $('.panel-body')
const list = $('#list')
const hint = $('.hint')

// ── Intro block ─────────────────────────────────────────────────────────────
$('.tagline').textContent = profile.tagline
$<HTMLAnchorElement>('#link-linkedin').href = profile.linkedin
$<HTMLAnchorElement>('#link-github').href = profile.github

// ── Rendering content as HTML (shared by the panel and the list view) ───────
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function roleNode(role: Role) {
  const node = el('div', 'role')
  node.append(el('h3', undefined, role.title))
  const meta = [role.period, role.location].filter(Boolean).join(' · ')
  if (meta) node.append(el('p', 'meta', meta))
  if (role.notes?.length) {
    const ul = el('ul')
    for (const note of role.notes) ul.append(el('li', undefined, note))
    node.append(ul)
  }
  return node
}

function placeNodes(place: Place) {
  return [
    el('p', 'kind', place.kind === 'education' ? 'Education' : 'Experience'),
    el('h2', 'place-name', place.name),
    ...place.roles.map(roleNode),
  ]
}

function projectNodes(project: Project) {
  const nodes: HTMLElement[] = [el('p', 'kind', 'Project'), el('h2', 'place-name', project.name)]
  if (project.placeholder) nodes.push(el('span', 'placeholder-note', 'Placeholder'))
  nodes.push(el('p', 'summary', project.summary))
  return nodes
}

// ── State ───────────────────────────────────────────────────────────────────
const world = createWorld($<HTMLCanvasElement>('#scene'), $('#labels'), $('#haze'), {
  onPick: (id) => select(id),
  onPickBalloon: () => setLevel(world.level === 'ground' ? 'sky' : 'ground'),
  onRelease: () => {
    panel.hidden = true
    document.body.classList.remove('has-selection')
    history.replaceState(null, '', location.pathname + location.search)
  },
  onPickNothing: () => {
    if (!panel.hidden) select(null)
  },
})

/** The hint under the scene says how to move between the island and the clouds. */
function syncHint() {
  hint.textContent = world.level === 'sky'
    ? 'Click an idea · click the balloon to go back down'
    : 'Drag to look around · click a building · ride the balloon to the clouds'
}

function select(id: string | null) {
  const place = places.find((p) => p.id === id)
  const project = projects.find((p) => p.id === id)
  document.body.classList.toggle('has-selection', !!(place || project))
  if (!place && !project) {
    panel.hidden = true
    world.focus(null)
    history.replaceState(null, '', location.pathname + location.search)
  } else {
    panelBody.replaceChildren(...(place ? placeNodes(place) : projectNodes(project!)))
    panel.hidden = false
    panel.scrollTop = 0
    world.focus(id)
    history.replaceState(null, '', `#/${id}`)
  }
  syncHint()
}

function setLevel(level: Level) {
  document.body.classList.remove('has-selection')
  panel.hidden = true
  world.focus(null, level)
  history.replaceState(null, '', location.pathname + location.search)
  syncHint()
}

$('#panel .close').addEventListener('click', () => select(null))

// ── List view ───────────────────────────────────────────────────────────────
function buildList() {
  const body = $('.list-body')
  body.append(el('h1', undefined, profile.name), el('p', undefined, profile.tagline))
  const section = (title: string, entries: Place[]) => {
    body.append(el('h2', undefined, title))
    for (const place of [...entries].reverse()) {
      const article = el('article')
      article.append(el('h3', undefined, place.name), ...place.roles.map(roleNode))
      body.append(article)
    }
  }
  section('Experience', places.filter((p) => p.kind === 'career'))
  section('Education', places.filter((p) => p.kind === 'education'))
  body.append(el('h2', undefined, 'Projects'))
  for (const project of projects) {
    const article = el('article')
    article.append(el('h3', undefined, project.name), el('p', 'summary', project.summary))
    body.append(article)
  }
}
buildList()
$('#open-list').addEventListener('click', () => (list.hidden = false))
$('#list .close').addEventListener('click', () => (list.hidden = true))

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!list.hidden) list.hidden = true
  else if (!panel.hidden) select(null)
  else if (world.level === 'sky') setLevel('ground')
})

// ── Deep links: /#/tiktok opens that building ───────────────────────────────
syncHint()
const fromHash = () => location.hash.replace(/^#\/?/, '')
if (fromHash()) select(fromHash())
window.addEventListener('hashchange', () => select(fromHash() || null))
