export type Item = {
  readonly id: number
  name: string
  description: string | null
  locationChain?: Location[] | undefined | null
  locationId: number | null
  parentLocationMarker?: ParentLocationMarker | null
  additionalInfo: (ParentLocationMarker | ItemLink)[] | null
  imagePath: string | null
  tags: string[]
  manufacturer: string | null
  model: string | null
  category: string | null
  links: ItemLink[] | null
  morestuff: string | null
}

export type Location = {
  readonly id: number
  name: string
  description: string | null
  imagePath: string | null
  parentId?: number | null
  parentLocationMarker?: ParentLocationMarker | null
  additionalInfo?: [ParentLocationMarker | Link] | null
}

export type ParentLocationMarker = {
  readonly id: number
  y: number
  x: number
}

export type Link = {
  readonly id: number
  name: string
  url: string
}

export type ItemLink = {
  url: string
  name: string
  type: string
}
