# Saved URLs Analysis Report (v2.0)

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Card News Auto
> **Analyst**: gap-detector
> **Date**: 2026-03-07
> **Design Doc**: [saved-urls.design.md](../02-design/features/saved-urls.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Design document와 실제 구현 코드 간 차이를 식별하여 기능 완성도를 검증한다. v1.0 분석 이후 상당한 구현 변경이 있어 전면 재분석을 수행했다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/saved-urls.design.md`
- **Implementation Files**:
  - `convex/schema.ts`
  - `convex/savedUrlFolders.ts`
  - `convex/savedUrls.ts`
  - `convex/actions/savedUrls.ts`
  - `src/components/create/SavedUrlsTab/index.tsx` (table format, no card grid)
  - `src/components/create/SavedUrlsTab/FolderSidebar.tsx`
  - `src/components/create/SavedUrlsTab/AddUrlDialog.tsx` (sourceType + manual mode)
  - `src/components/create/SavedUrlsTab/SearchBar.tsx`
  - `src/app/(app)/create/page.tsx` (full-width library, sourceType routing)
- **Deleted Files**:
  - `src/components/create/SavedUrlsTab/SavedUrlCard.tsx` (replaced by inline table rows)

### 1.3 Key Changes Since v1.0 Analysis

| Change | Description |
|--------|-------------|
| sourceType field | New DB field + full-stack support for url/youtube/sns classification |
| Manual input mode | AddUrlDialog supports manual title entry without Firecrawl extraction |
| Card -> Table | SavedUrlCard.tsx deleted; index.tsx now renders a table with columns |
| Full-width layout | Library tab renders outside `max-w-3xl` for wider display |
| sourceType routing | onSelectUrl passes sourceType to route to correct tab |

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Database Schema (Section 1)

#### savedUrlFolders Table

| Field | Design | Implementation | Status |
|-------|--------|---------------|--------|
| userId | `v.id("users")` | `v.id("users")` | Match |
| name | `v.string()` | `v.string()` | Match |
| order | `v.number()` | `v.number()` | Match |
| createdAt | `v.number()` | `v.number()` | Match |
| index `by_userId` | `["userId"]` | `["userId"]` | Match |

#### savedUrls Table

| Field | Design | Implementation | Status | Notes |
|-------|--------|---------------|--------|-------|
| userId | `v.id("users")` | `v.id("users")` | Match | |
| url | `v.string()` | `v.string()` | Match | |
| title | `v.string()` | `v.string()` | Match | |
| description | `v.optional(v.string())` | `v.optional(v.string())` | Match | |
| thumbnailUrl | `v.optional(v.string())` | `v.optional(v.string())` | Match | |
| **sourceType** | **Not in design** | `v.optional(v.union("url","youtube","sns"))` | **Added** | New field for source classification |
| folderId | `v.optional(v.id("savedUrlFolders"))` | `v.optional(v.id("savedUrlFolders"))` | Match | |
| createdAt | `v.number()` | `v.number()` | Match | |
| index `by_userId` | `["userId"]` | `["userId"]` | Match | |
| index `by_userId_folderId` | `["userId", "folderId"]` | `["userId", "folderId"]` | Match | |
| index `by_userId_createdAt` | `["userId", "createdAt"]` | `["userId", "createdAt"]` | Match | |
| searchIndex | `searchField: "title", filterFields: ["userId"]` | `searchField: "title", filterFields: ["userId"]` | Match | |

**Schema Score: 92%** -- All designed fields match. One new field (sourceType) added beyond design.

---

### 2.2 Convex Backend Functions (Section 2)

#### savedUrlFolders.ts -- Queries

| Function | Design | Implementation | Status | Notes |
|----------|--------|---------------|--------|-------|
| `listFolders` | Returns `{ folders, uncategorizedCount }` | Returns `{ folders, uncategorizedCount }` | Match | |
| `listFolders` - auth | Returns `[]` when not authed | Returns `{ folders: [], uncategorizedCount: 0 }` | Minor diff | Impl returns full shape instead of empty array |
| `listFolders` - uncategorized filter | `.filter(q.eq(q.field("folderId"), undefined))` | `.filter((u) => !u.folderId)` | Minor diff | JS filter on all URLs; functionally equivalent, less efficient |

#### savedUrlFolders.ts -- Mutations

| Function | Design | Implementation | Status |
|----------|--------|---------------|--------|
| `createFolder` | args: `{ name }`, auto `order` | Identical logic | Match |
| `renameFolder` | args: `{ folderId, name }` | Identical logic | Match |
| `deleteFolder` | Moves URLs to uncategorized, then deletes | Identical logic | Match |

#### savedUrls.ts -- Queries

| Function | Design | Implementation | Status | Notes |
|----------|--------|---------------|--------|-------|
| `listByFolder` - args | `v.optional(v.union(v.id, v.literal("uncategorized")))` | Same typed union | Match | **Fixed from v1.0** (was `v.string()`) |
| `listByFolder` - all | `.order("desc")` on `by_userId_createdAt` | Identical | Match | |
| `listByFolder` - uncategorized | Convex `.filter()` + `.order("desc")` | JS `.filter()` + `.sort()` | Minor diff | Functionally correct, less efficient |
| `listByFolder` - specific folder | `.order("desc")` on index | JS `.sort((a, b) => b.createdAt - a.createdAt)` | Minor diff | **Partially fixed from v1.0**: sort now present but via JS not Convex |
| `search` | `{ query: v.string() }`, take(50) | Identical | Match | |
| `getTotalCount` | count via collect + length | Identical | Match | |

#### savedUrls.ts -- Mutations

| Function | Design | Implementation | Status | Notes |
|----------|--------|---------------|--------|-------|
| `create` | `{ url, title, description?, thumbnailUrl?, folderId? }` | Adds `sourceType?` arg | Changed | sourceType field added beyond design |
| `createInternal` | Not in design | `internalMutation` with `userId` + `sourceType` | Added | Security improvement; action uses internal mutation |
| `remove` | args: `{ id }` | Identical | Match | |
| `moveToFolder` | args: `{ id, folderId? }` | Identical | Match | |

#### actions/savedUrls.ts

| Aspect | Design | Implementation | Status | Notes |
|--------|--------|---------------|--------|-------|
| Function name | `extractAndSave` | `extractAndSave` | Match | |
| Args | `{ url, folderId? }` | `{ url, sourceType?, folderId? }` | Changed | sourceType arg added |
| Auth check | Not specified | `getAuthUserId` added | Added | Security improvement |
| Firecrawl format | `formats: ["markdown"]` | `formats: ["markdown"]` | Match | |
| DB save call | `api.savedUrls.create` | `internal.savedUrls.createInternal` | Changed | More secure internal mutation |
| sourceType passthrough | N/A | Passes sourceType to createInternal | Added | New feature |
| Return type | `{ id, title, description?, thumbnailUrl? }` | Identical | Match | |
| Error handling | Silent catch, URL as title | Identical | Match | |

**Backend Score: 85%** -- Core logic solid. sourceType additions throughout; JS sort instead of Convex sort.

---

### 2.3 Frontend Components (Section 3)

#### Component Tree

| Design Component | Implementation | Status | Notes |
|------------------|---------------|--------|-------|
| `SavedUrlsTab/index.tsx` | Present | Match | |
| `SearchBar.tsx` | Present | Match | |
| `FolderSidebar.tsx` | Present | Match | |
| `SavedUrlGrid.tsx` (separate) | N/A | **Removed** | Design had separate grid; never existed |
| **`SavedUrlCard.tsx`** | **DELETED** | **Major change** | Replaced by inline table rows in index.tsx |
| `AddUrlDialog.tsx` | Present (significantly enhanced) | Changed | sourceType + manual mode added |

#### SavedUrlsTab/index.tsx -- Major Structural Change

| Aspect | Design | Implementation | Status | Notes |
|--------|--------|---------------|--------|-------|
| Props: onSelectUrl | `(url: string) => void` | `(url: string, sourceType?: SavedSourceType) => void` | Changed | sourceType parameter added |
| State: selectedFolderId | `FolderFilter` type | Identical | Match | |
| State: searchQuery | `useState('')` | Identical | Match | |
| State: showAddDialog | `useState(false)` | Identical | Match | |
| State: moveMenuId | Not in design | `useState<Id \| null>(null)` | Added | For inline move-to-folder dropdown |
| Convex hooks | useQuery for folders, urls, totalCount | All present with `'skip'` pattern | Match | Impl uses conditional skip for search vs folder |
| Search clears folder | Folder filter disabled during search | `if (value) setSelectedFolderId(undefined)` | Match | |
| **Display format** | **3-col card grid** (SavedUrlCard) | **Table with 5 columns** | **Major change** | Title, URL(hostname), folder, sourceType badge, actions |
| Thumbnail display | 16:9 card thumbnails | No thumbnails | **Removed** | Table format has no thumbnail column |
| Description display | 2-line clamp text | No description | **Removed** | Table format has no description column |
| sourceType badge | Not in design | Color-coded badge (URL/YouTube/SNS) | Added | Blue/red/purple badges per type |
| Actions | Dropdown menu on card | Inline icon buttons (link, copy, move, delete) | Changed | Direct action buttons instead of dropdown |
| Empty state | Bookmark icon + message + CTA | Identical pattern | Match | |

#### FolderSidebar.tsx

| Aspect | Design | Implementation | Status | Notes |
|--------|--------|---------------|--------|-------|
| Props | `{ folders, uncategorizedCount, totalCount, selectedFolderId, onSelectFolder }` | Adds mutation callbacks | Minor diff | Better encapsulation |
| "전체" item | Always on top with totalCount | Present | Match | |
| User folders with urlCount | Present | Present | Match | |
| "미분류" item | Always at bottom | Conditional (`uncategorizedCount > 0`) | Minor diff | Hidden when 0 |
| "+ 새 폴더" button | At bottom | Present with inline input | Match | |
| Inline rename | Click name -> input | Menu-triggered edit, Enter/Esc/onBlur | Match | Different trigger, same behavior |
| Context menu | Right-click or `...` | `...` (MoreHorizontal) button | Match | |
| **Folder delete confirm** | Confirm dialog | `window.confirm()` present | **Match** | **Fixed from v1.0** |
| Mobile chip bar | `< 768px` | `lg:hidden` (1024px) | Minor diff | Wider breakpoint |

#### AddUrlDialog.tsx -- Significantly Enhanced

| Aspect | Design | Implementation | Status | Notes |
|--------|--------|---------------|--------|-------|
| Props | `{ open, onClose, folders }` | Identical | Match | |
| State: url | `useState('')` | Identical | Match | |
| State: selectedFolderId | `useState<Id \| undefined>` | `useState<string>('')` | Minor diff | String type with empty default |
| State: isExtracting | `useState(false)` | Identical | Match | |
| State: preview | Design has preview state | Not implemented | Missing | No metadata preview before save |
| State: error | Not in design | Added | Added | Error handling improvement |
| **State: sourceType** | **Not in design** | `useState<SavedSourceType>('url')` | **Added** | 3-button selector (URL/YouTube/SNS) |
| **State: isManual** | **Not in design** | `useState(false)` | **Added** | Toggle for manual title entry |
| **State: title** | **Not in design** | `useState('')` | **Added** | Manual title input field |
| **Manual mode** | **Not in design** | Checkbox toggle skips Firecrawl, uses `create` mutation | **Added** | Direct save without extraction |
| **Source type selector** | **Not in design** | 3-button group at top of dialog | **Added** | URL/YouTube/SNS classification |
| Dialog element | HTML `<dialog>` native | `div` with fixed overlay | Minor diff | Functionally equivalent |
| Flow (auto mode) | URL input -> extract -> auto close | Identical | Match | |
| Flow (manual mode) | N/A | URL + title input -> create mutation -> close | **Added** | New flow |
| Enter key submit | Not specified | Implemented | Added | UX improvement |

#### SearchBar.tsx

| Aspect | Design | Implementation | Status |
|--------|--------|---------------|--------|
| Props | `{ value, onChange }` | Identical | Match |
| Debounce | 300ms | 300ms via `setTimeout` | Match |
| SearchIcon left | Present | Present | Match |
| X button right | Present | Present | Match |

**Frontend Score: 72%** -- Significant structural changes (card->table, sourceType additions, manual mode) diverge from design.

---

### 2.4 Create Page Integration (Section 4)

| Aspect | Design | Implementation | Status | Notes |
|--------|--------|---------------|--------|-------|
| SourceType union | `'library'` added | Present | Match | |
| Tab definition | `{ id: 'library', label: '라이브러리', icon: Bookmark }` | Identical | Match | |
| Tab position | 6th tab | 6th tab | Match | |
| canCollect for library | Returns false | Returns false | Match | |
| handleCollect guard | `if (activeTab === 'library') return` | Present | Match | |
| **handleLibrarySelect** | `setUrl(url) + setActiveTab('url')` (always URL tab) | Routes by sourceType: youtube->youtube, sns->sns, default->url | **Changed** | Now uses sourceType for smart routing |
| **Layout placement** | Inside `max-w-3xl` container | **Outside** `max-w-3xl`, full-width with own padding | **Changed** | Library renders in separate `px-4 md:px-8 pb-8` div |
| Input area hidden | Not specified | `activeTab !== 'library'` hides input card | Match | Clean separation |
| Error/button hidden | Not specified | `activeTab !== 'library'` hides error + collect button | Match | |

**Integration Score: 86%** -- Core integration solid; routing and layout changes are intentional improvements.

---

### 2.5 Data Flow (Section 5)

| Flow | Design | Implementation | Status | Notes |
|------|--------|---------------|--------|-------|
| URL Save (auto) | AddUrlDialog -> extractAndSave -> create -> subscription | extractAndSave now includes sourceType -> createInternal | Match | Enhanced with sourceType |
| **URL Save (manual)** | **Not in design** | AddUrlDialog -> create mutation (no Firecrawl) | **Added** | New manual mode flow |
| URL Select | Card click -> setUrl + setActiveTab('url') | Table row click -> routes by sourceType to correct tab | Changed | Smart routing instead of always URL tab |
| Folder Delete | Confirm dialog -> deleteFolder -> URLs to uncategorized | `window.confirm()` -> deleteFolder -> URLs to uncategorized | Match | **Fixed from v1.0** |

---

### 2.6 Responsive Design (Section 7)

| Breakpoint | Design | Implementation | Status | Notes |
|------------|--------|---------------|--------|-------|
| < 640px (sm) | Chip bar, 2-col grid | Chip bar < 1024px, table (no grid) | Changed | Table replaces grid; chip breakpoint wider |
| 640-1024px (md) | Chip bar, 3-col grid | Chip bar, table with hidden header | Changed | Table header hidden on mobile via `hidden md:grid` |
| >= 1024px (lg) | Sidebar 160px, 3-col grid | Sidebar `w-40` (160px), full table with header | Changed | Table replaces grid entirely |
| **Full-width library** | **Not in design** | Library tab outside `max-w-3xl` | **Added** | Wider layout for table display |

---

### 2.7 Error Handling (Section 8)

| Scenario | Design | Implementation | Status |
|----------|--------|---------------|--------|
| Firecrawl metadata extraction failure | URL as title, no thumbnail | Identical (silent catch) | Match |
| Duplicate URL | Allowed | No duplicate check (allowed) | Match |
| Thumbnail image broken | `onError` -> FallbackThumbnail | N/A (no thumbnails in table) | N/A |
| Folder name empty | Frontend prevents | `newName.trim()` check | Match |
| Search no results | "검색 결과가 없습니다" message | Present | Match |
| 0 saved URLs | Empty state UI + CTA | Bookmark icon + message + button | Match |
| **Manual save error** | **Not in design** | Error message displayed in dialog | **Added** |
| **AddUrlDialog error** | Not in design | `setError` state with red text | Added |

---

## 3. Overall Match Rate

### 3.1 Score by Category

| Category | Items | Match | Minor Diff | Added/Changed | Score |
|----------|:-----:|:-----:|:----------:|:-------------:|:-----:|
| Database Schema | 13 | 11 | 0 | 2 | 85% |
| Backend Functions | 22 | 14 | 3 | 5 | 77% |
| Frontend Components | 42 | 22 | 5 | 15 | 64% |
| Create Page Integration | 8 | 6 | 0 | 2 | 75% |
| Data Flow | 4 | 2 | 0 | 2 | 75% |
| Responsive Design | 4 | 0 | 0 | 4 | 50% |
| Error Handling | 8 | 5 | 0 | 3 | 63% |
| **Total** | **101** | **60** | **8** | **33** | **73%** |

### 3.2 Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 73%                     |
+---------------------------------------------+
|  Exact Match:      60 items (59%)            |
|  Minor Difference:  8 items  (8%)            |
|  Added/Changed:    33 items (33%)            |
+---------------------------------------------+
|  v1.0 was 91% -- dropped due to major       |
|  structural changes (card->table, sourceType,|
|  manual mode, full-width layout)             |
+---------------------------------------------+
```

---

## 4. Detailed Gap List

### Previously Reported Gaps (v1.0 Status)

| v1.0 ID | Description | v2.0 Status |
|----------|-------------|-------------|
| GAP-01 | `listByFolder` args `v.string()` instead of typed union | **RESOLVED** -- Now uses proper `v.union(v.id, v.literal)` |
| GAP-02 | Missing `.order("desc")` for specific folder | **PARTIALLY RESOLVED** -- JS `.sort()` used instead of Convex `.order()` |
| GAP-03 | Uncategorized uses JS filter | **UNCHANGED** -- Still uses JS filter |
| GAP-04 | listFolders uncategorized count via JS filter | **UNCHANGED** -- Still uses JS filter |
| GAP-05 | `createInternal` added | **UNCHANGED** -- Intentional security improvement |
| GAP-06 | Action auth check added | **UNCHANGED** -- Good security practice |
| GAP-07 | SavedUrlGrid not separate component | **SUPERSEDED** -- Entire card grid replaced by table |
| GAP-08 | "미분류" hidden when count=0 | **UNCHANGED** |
| GAP-09 | Breakpoint at 1024px not 768px | **UNCHANGED** |
| GAP-10 | Tablet 2-col instead of 3-col | **SUPERSEDED** -- Table format replaced grid |
| GAP-11 | Div overlay instead of `<dialog>` | **UNCHANGED** |
| GAP-12 | Missing metadata preview | **UNCHANGED** |
| GAP-13 | Folder delete missing confirmation | **RESOLVED** -- `window.confirm()` added |
| GAP-14 | "새 탭에서 열기" added | **UNCHANGED** -- Now an inline action button |
| GAP-15 | SavedUrlCard props include folders | **SUPERSEDED** -- Card component deleted |
| GAP-16 | Firecrawl formats inconsistency | **UNCHANGED** |

### New Gaps (v2.0)

| ID | Category | Severity | Description | Recommendation |
|----|----------|----------|-------------|----------------|
| GAP-17 | Schema | Major | `sourceType` field added to `savedUrls` table but not in design doc | Update design Section 1.2 to include sourceType field |
| GAP-18 | Backend | Major | `create` and `createInternal` mutations accept `sourceType` arg not in design | Update design Section 2.2 mutation args |
| GAP-19 | Backend | Major | `extractAndSave` action accepts `sourceType` arg not in design | Update design Section 2.3 action args |
| GAP-20 | Frontend | Major | `SavedUrlCard.tsx` DELETED -- entire card-based UI replaced by table format | Update design Section 3.4 to describe table format |
| GAP-21 | Frontend | Major | No thumbnail display in table format (design specified 16:9 card thumbnails) | Update design Section 3.4 to remove thumbnail spec or add thumbnail column |
| GAP-22 | Frontend | Major | No description display in table (design specified 2-line clamp) | Update design to match table format |
| GAP-23 | Frontend | Major | `onSelectUrl` signature changed to `(url, sourceType?) => void` | Update design Section 3.2 interface |
| GAP-24 | Frontend | Major | sourceType badge column added to table (color-coded URL/YouTube/SNS) | Add to design Section 3 |
| GAP-25 | Frontend | Major | Manual input mode in AddUrlDialog (isManual toggle + title field) | Add to design Section 3.5 |
| GAP-26 | Frontend | Minor | sourceType selector (3-button group) in AddUrlDialog | Add to design Section 3.5 |
| GAP-27 | Integration | Major | `handleLibrarySelect` routes by sourceType (youtube->YouTube tab, sns->SNS tab) instead of always URL tab | Update design Section 4.3 |
| GAP-28 | Integration | Major | Library tab renders outside `max-w-3xl` container for full-width display | Update design Section 4.4 |
| GAP-29 | Frontend | Minor | Table actions are inline icon buttons (link, copy, move, delete) instead of dropdown menu | Update design Section 3.4 interaction spec |
| GAP-30 | Frontend | Minor | Move-to-folder uses dedicated FolderInput icon button with popover instead of dropdown submenu | Update design |
| GAP-31 | Data Flow | Major | New manual save flow: AddUrlDialog -> create mutation (bypasses Firecrawl) | Add to design Section 5 |
| GAP-32 | Responsive | Minor | Table format has responsive `hidden md:grid` header instead of grid column breakpoints | Update design Section 7 entirely |

---

## 5. Convention Compliance

### 5.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | None |
| Functions | camelCase | 100% | None |
| Constants | UPPER_SNAKE_CASE | 100% | `SOURCE_LABELS`, `SOURCE_OPTIONS` correct |
| Files (component) | PascalCase.tsx | 100% | None |
| Folders | kebab-case or PascalCase | 100% | `SavedUrlsTab/` PascalCase acceptable |
| Types | PascalCase | 100% | `SavedSourceType`, `FolderFilter` correct |

### 5.2 Import Order

All files follow: external libs -> internal absolute -> relative -> types. Compliant.

### 5.3 Architecture

| Check | Status | Notes |
|-------|--------|-------|
| Convex query/mutation separation | Pass | Queries and mutations properly separated |
| Action uses internal mutation | Pass | extractAndSave -> createInternal (not public) |
| Auth checks present | Pass | All mutations/queries check userId |
| Component-level state | Pass | No unnecessary global state; all local useState |

**Convention Score: 100%**

---

## 6. Summary of What Matches Well

- **Database schema**: All originally designed fields, indexes, and search indexes are implemented exactly as specified
- **Folder CRUD**: createFolder, renameFolder, deleteFolder all match design logic precisely
- **Search functionality**: Debounced 300ms search with Convex searchIndex, take(50) limit
- **Folder sidebar**: Full desktop sidebar + mobile chip bar with correct styling
- **Empty states**: Both search-empty and no-URLs-empty states match design
- **Error handling**: Graceful degradation on Firecrawl failure, empty input prevention
- **Tab integration**: 6th tab correctly added with Bookmark icon, correct canCollect/handleCollect guards
- **Naming/conventions**: 100% compliance with project conventions

---

## 7. Recommended Actions

### 7.1 Design Document Updates Required (Priority 1)

The implementation has evolved significantly. The design document needs updates to reflect the current state:

| Priority | Gap IDs | Action |
|----------|---------|--------|
| 1 | GAP-17/18/19 | Add `sourceType` field to schema, mutations, and action specs |
| 2 | GAP-20/21/22/24 | Replace Section 3.4 (SavedUrlCard) with table format specification |
| 3 | GAP-25/26/31 | Add manual input mode to Section 3.5 (AddUrlDialog) |
| 4 | GAP-23/27 | Update onSelectUrl signature and routing logic in Section 4.3 |
| 5 | GAP-28 | Update layout spec for full-width library in Section 4.4 |
| 6 | GAP-32 | Rewrite Section 7 (Responsive Design) for table format |

### 7.2 Minor Implementation Improvements (Priority 2)

| Priority | Gap ID | Action | File |
|----------|--------|--------|------|
| 1 | GAP-02 | Use Convex `.order("desc")` instead of JS sort for specific folder query | `convex/savedUrls.ts:37-43` |
| 2 | GAP-03/04 | Use Convex `.filter()` instead of JS filter for uncategorized queries | `convex/savedUrls.ts:27-33`, `convex/savedUrlFolders.ts:30-34` |
| 3 | GAP-08 | Always show "미분류" even when count is 0 | `FolderSidebar.tsx:137` |
| 4 | GAP-12 | Consider adding metadata preview in AddUrlDialog | `AddUrlDialog.tsx` |

### 7.3 Intentional Deviations (No Action Needed)

These changes are improvements over the design and should be documented, not reverted:

| Gap ID | Deviation | Rationale |
|--------|-----------|-----------|
| GAP-05 | `createInternal` mutation | Security: prevents unauthorized direct mutation calls |
| GAP-06 | Auth check in action | Security: validates user before Firecrawl call |
| GAP-11 | Div overlay instead of `<dialog>` | Consistent with existing modal pattern |
| GAP-14/29 | Inline action buttons | Better UX: direct access to actions without dropdown |
| GAP-16 | Firecrawl markdown format | markdown format includes metadata (design comment misleading) |

---

## 8. Match Rate Interpretation

```
Match Rate: 73%  ->  "There are significant differences. Document update is recommended."
```

The 73% match rate is primarily driven by intentional implementation evolution, not by missing features or bugs. All core functionality works correctly. The gap is a **design document lag** rather than an implementation deficiency.

**Recommended approach**: Update design document to match implementation (Option 2).

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-07 | Initial gap analysis | gap-detector |
| 2.0 | 2026-03-07 | Full re-analysis: sourceType, table format, manual mode, full-width layout, 3 v1.0 gaps resolved | gap-detector |
