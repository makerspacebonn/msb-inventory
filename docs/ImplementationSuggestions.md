# Implementation Suggestions

Optional architectural improvements and future considerations identified via architectural review (2026-01-19). These are **not critical** but would improve maintainability, testability, or scalability.

---

## State Management

### Add TanStack Query for Client-Side Caching

**Current State:**
- No global state management
- Each route manages its own data independently
- No automatic cache invalidation or refetching
- Potential stale data issues on navigation

**Suggestion:**
Integrate TanStack Query (React Query) for:
- Automatic background refetching
- Cache management with configurable stale times
- Optimistic updates for better UX
- Deduplicated requests

**Example:**
```typescript
// Before: Manual fetching in route loader
loader: async () => {
  return fetchPaginatedItems({ data: { page: 1, pageSize: 24 } })
}

// After: TanStack Query integration
const { data, isLoading } = useQuery({
  queryKey: ['items', { page, pageSize }],
  queryFn: () => fetchPaginatedItems({ data: { page, pageSize } })
})
```

**Impact:** Medium improvement to UX, prevents stale data
**Effort:** 2-3 days

---

## File Storage

### Abstract File Storage for Future Scalability

**Current State:**
- Direct `fs` calls scattered across:
  - `src/actions/backupActions.ts`
  - `src/actions/locationActions.ts`
  - `src/actions/itemActions.ts`
  - `src/routes/img.$.ts`
- Locks application to local filesystem
- Harder to test (requires filesystem mocking)

**Suggestion:**
Create `FileStorage` interface for pluggable storage backends:

```typescript
// src/services/FileStorage.ts
export interface FileStorage {
  save(path: string, content: Buffer): Promise<string>
  delete(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  read(path: string): Promise<Buffer>
  getUrl(path: string): string
}

export class LocalFileStorage implements FileStorage { ... }
// Future: S3FileStorage, MinIOStorage, CloudflareR2Storage
```

**Benefits:**
- Easy migration to cloud storage (S3, MinIO, R2) when needed
- Testable with mock storage implementation
- Centralized file handling logic

**Impact:** High for future scalability
**Effort:** 2-3 days

---

## Repository Pattern

### Consider Singleton or Dependency Injection

**Current State:**
```typescript
// New instance created on every call
const itemRepo = new ItemRepository()
await itemRepo.findById(id)
```

**Potential Issues:**
- No connection pooling benefits (Drizzle handles this, but pattern unclear)
- Harder to mock for testing
- No shared state between repository instances

**Options:**

1. **Singleton Pattern:**
```typescript
// src/repositories/index.ts
export const itemRepository = new ItemRepository()
export const locationRepository = new LocationRepository()
```

2. **Dependency Injection (more complex):**
```typescript
// Using a simple DI container
const container = {
  itemRepository: new ItemRepository(db),
  locationRepository: new LocationRepository(db),
}
```

**Recommendation:** For this project size, singleton pattern is sufficient. DI is overkill.

**Impact:** Low (Drizzle already handles connections)
**Effort:** 0.5 days

---

## Caching

### Improve In-Memory Cache Strategy

**Current State:**
- `statsActions.ts` lines 17-18: global `cachedStats` with 24-hour TTL
- `TagsRepository.ts` lines 6-9: global `tagsCache` with 1-minute TTL
- No invalidation on data changes = stale data risk

**Suggestion:**
Create centralized cache utility with invalidation:

```typescript
// src/lib/cache.ts
class SimpleCache<T> {
  private data: T | null = null
  private expiry: number = 0

  constructor(private ttlMs: number) {}

  get(): T | null {
    if (Date.now() > this.expiry) return null
    return this.data
  }

  set(data: T): void {
    this.data = data
    this.expiry = Date.now() + this.ttlMs
  }

  invalidate(): void {
    this.data = null
    this.expiry = 0
  }
}

// Usage
export const statsCache = new SimpleCache<DashboardStats>(24 * 60 * 60 * 1000)
export const tagsCache = new SimpleCache<string[]>(60 * 1000)

// Invalidate when items change
await itemRepository.upsert(item)
statsCache.invalidate()
tagsCache.invalidate()
```

**Impact:** Medium (prevents stale data)
**Effort:** 0.5 days

---

## Security

### Input Sanitization Improvements

**Current State:**
Some server functions use simple validators without sanitization:
```typescript
.inputValidator((query: string) => query)  // No sanitization
```

**Note:** SQL injection is prevented by Drizzle ORM (parameterized queries), but XSS could occur if values are rendered unsanitized.

**Suggestion:**
Add sanitization for user-facing content:

```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input)
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>&"']/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char))
}
```

**Impact:** Low (Drizzle prevents SQL injection, React escapes by default)
**Effort:** 0.5 days

---

## Scaling Considerations

### Near-Term (100s of Users)

| Improvement | Purpose |
|-------------|---------|
| TanStack Query | Client-side caching, prevents unnecessary refetches |
| Image optimization | Resize on upload, serve WebP, consider CDN |
| Database indexes | Already good coverage - monitor query performance |

### Medium-Term (1000s of Users)

| Improvement | Purpose |
|-------------|---------|
| File storage abstraction | Migrate to S3/MinIO for horizontal scaling |
| Read replicas | For search queries (already read-heavy workload) |
| Rate limiting | On AI analysis endpoint to manage Gemini API costs |

### Long-Term (Multi-tenancy)

| Improvement | Purpose |
|-------------|---------|
| Tenant isolation | Row-level security in PostgreSQL |
| Queue system | For AI analysis, backups (BullMQ or similar) |
| Microservices | Only if truly needed (likely overkill for this domain) |

---

## Code Quality

### Remove Debug Routes

**Current State:**
- `src/routes/test.tsx` - Debug route
- `src/routes/items/testedit.tsx` - Test edit route

**Suggestion:**
Either remove or document these routes. If needed for development:
1. Add `NODE_ENV` check to hide in production
2. Document their purpose in comments

---

### Type Safety Improvements

**Current Issue:**
Double casting in `changelogActions.ts`:
```typescript
// Lines 127, 158
as unknown as Record<string, unknown>
```

**Suggestion:**
Properly extend types to avoid double casting:
```typescript
// Extend Drizzle types properly
type ChangelogBeforeValues = Partial<ItemSelect | LocationSelect>
```

---

## Summary

| Suggestion | Priority | Effort | Impact |
|------------|----------|--------|--------|
| TanStack Query | Medium | 2-3 days | Better UX, no stale data |
| File Storage Abstraction | Low | 2-3 days | Future scalability |
| Repository Singleton | Low | 0.5 days | Cleaner code |
| Cache Invalidation | Medium | 0.5 days | Data consistency |
| Input Sanitization | Low | 0.5 days | Defense in depth |
| Remove Debug Routes | Low | 0.5 hours | Cleaner codebase |

**Recommendation:** Focus on Backlog items (ARCH-001 through ARCH-005) first. These suggestions are for after core consolidation is complete.
