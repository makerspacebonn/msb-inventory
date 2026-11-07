export type Item = {
  readonly id: number
  name: string
  description: string | null
  locationChain?: Location[] | undefined | null
  locationId: number | null
  parentLocationMarker?: ParentLocationMarker | null
  additionalInfo: (ParentLocationMarker | ItemLink)[] | null
  /** The main picture, shown in lists */
  imagePath: string | null
  /** Further pictures after the main one, in their order */
  extraImagePaths: string[]
  // Name of the item's direct location; only filled in item lists
  locationName?: string | null
  tags: string[] | null
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

/** A value as stored in a JSON column */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export type ChangelogEntry = {
  readonly id: number
  entityType: EntityType
  entityId: number
  changeType: ChangeType
  userId: string | null
  changedAt: Date
  // Entity snapshots, stored as JSON (dates become strings)
  beforeValues: JsonObject | null
  afterValues: JsonObject | null
  changedFields: string[] | null
  /** Entries with the same group are undone together */
  groupId: string | null
}

export type ChangelogEntryWithUser = ChangelogEntry & {
  user: { name: string | null } | null
  entityName: string | null
  /** Whether the item or location still exists, so its page can be opened */
  entityExists: boolean
  /** How many entries are undone together with this one, itself included */
  groupSize: number
}

export type UndoResult = {
  success: boolean
  action?: "deleted" | "restored"
  error?: string
  conflictId?: number
  newId?: number
  /** How many changelog entries were undone */
  undoneCount?: number
}
