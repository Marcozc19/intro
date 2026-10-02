export type Role = {
  title: string
  period?: string
  location?: string
  notes?: string[]
}

export type Place = {
  id: string
  name: string
  /** Shorter name for the floating label in the scene. */
  short?: string
  kind: 'education' | 'career'
  /** Which builder in scene/buildings.ts draws this place. */
  style: string
  /** 'small' draws the building at a reduced size, for the lesser-known names. */
  size?: 'small'
  roles: Role[]
}

export type Project = {
  id: string
  name: string
  summary: string
  color: string
  placeholder?: boolean
}

/** Oldest first: this is the order buildings appear along the path. */
export const places: Place[] = [
  {
    id: 'tsinghua',
    name: 'Tsinghua University',
    short: 'Tsinghua',
    kind: 'education',
    style: 'tsinghua',
    roles: [{ title: 'B.E., Industrial Engineering — Operations Research' }],
  },
  {
    id: 'kuka',
    name: 'KUKA',
    kind: 'career',
    style: 'factory',
    roles: [
      {
        title: 'Layout Engineer',
        period: 'Jul 2020 – Aug 2020',
        location: 'Kunshan, Jiangsu, China',
        notes: [
          'Worked in a team of 3 on layout design of motor engine and cylinder head assembly lines for BMW and Volkswagen, using SimPro.',
          'The design was later implemented by BMW at its new factory in Jiading, Shanghai.',
        ],
      },
    ],
  },
  {
    id: 'wework',
    name: 'WeWork',
    kind: 'career',
    style: 'wework',
    roles: [
      {
        title: 'Data Analyst',
        period: 'Jun 2021 – Aug 2021',
        location: 'Shanghai, China',
        notes: ['Business Intelligence and Data Team'],
      },
    ],
  },
  {
    id: 'pico',
    name: 'ByteDance',
    short: 'ByteDance · Pico',
    kind: 'career',
    style: 'pico',
    roles: [
      {
        title: 'Product Manager, PicoVR',
        period: 'Mar 2022 – Aug 2022',
        location: 'Beijing, China',
        notes: [
          'Pico Worlds team. Pico Worlds is a user-generated-content driven metaverse service that lets individuals build their own VR worlds and assets.',
        ],
      },
    ],
  },
  {
    id: 'cornell',
    name: 'Cornell Tech',
    kind: 'education',
    style: 'cornell',
    roles: [
      { title: 'M.S., Information Systems', location: 'Cornell University · New York, NY' },
      {
        title: 'Graduate Research Assistant',
        period: 'Sep 2024 – Jun 2025',
        location: 'New York, NY',
        notes: ['Worked on a semantic-based recommendation system for arXiv.'],
      },
    ],
  },
  {
    id: '4149',
    name: '4149',
    kind: 'career',
    style: 'studio',
    size: 'small',
    roles: [{ title: 'AI Product', period: 'Dec 2023 – Jun 2024', location: 'New York, NY' }],
  },
  {
    id: 'echo3d',
    name: 'echo3D',
    kind: 'career',
    style: 'echo3d',
    size: 'small',
    roles: [{ title: 'Software Engineer Intern', period: 'Jun 2024 – Aug 2024', location: 'New York, NY' }],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    kind: 'career',
    style: 'tiktok',
    roles: [
      {
        title: 'Product Manager',
        period: 'Jun 2025 – Present',
        location: 'San Jose, CA',
        notes: ['Developer Platform'],
      },
    ],
  },
]

/** Cloud level. These are placeholders until the real projects are filled in. */
export const projects: Project[] = [
  {
    id: 'project-1',
    name: 'Project one',
    summary: 'Placeholder. Replace with a personal project: what it is, why you built it, and a link.',
    color: '#ffd166',
    placeholder: true,
  },
  {
    id: 'project-2',
    name: 'Project two',
    summary: 'Placeholder. Replace with a product idea you are exploring.',
    color: '#ef7da0',
    placeholder: true,
  },
  {
    id: 'project-3',
    name: 'Project three',
    summary: 'Placeholder. Replace with something you are building next.',
    color: '#7cc6fe',
    placeholder: true,
  },
]

export const profile = {
  name: 'Marco Zhuang',
  tagline: 'Product Manager @ TikTok · AI/ML',
  linkedin: 'https://www.linkedin.com/in/marco-zhuang',
  github: 'https://github.com/Marcozc19',
}
