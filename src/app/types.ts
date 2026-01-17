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
  createdAt: Date
  updatedAt: Date | null
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

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type EntityType = "item" | "location"
export type ChangeType = "create" | "update" | "delete"

export type ChangelogEntry = {
  readonly id: number
  entityType: EntityType
  entityId: number
  changeType: ChangeType
  userId: string | null
  changedAt: Date
  beforeValues: Record<string, unknown> | null
  afterValues: Record<string, unknown> | null
  changedFields: string[] | null
}

export type ChangelogEntryWithUser = ChangelogEntry & {
  user: { name: string | null } | null
  entityName: string | null
}

export type UndoResult = {
  success: boolean
  action?: "deleted" | "restored"
  error?: string
  conflictId?: number
  newId?: number
}
