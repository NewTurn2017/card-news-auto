'use client'

import { useState } from 'react'
import { FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'

type FolderFilter = Id<'savedUrlFolders'> | 'uncategorized' | undefined

interface FolderSidebarProps {
  folders: { _id: Id<'savedUrlFolders'>; name: string; urlCount: number }[]
  uncategorizedCount: number
  totalCount: number
  selectedFolderId: FolderFilter
  onSelectFolder: (id: FolderFilter) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: Id<'savedUrlFolders'>, name: string) => void
  onDeleteFolder: (id: Id<'savedUrlFolders'>) => void
}

export default function FolderSidebar({
  folders,
  uncategorizedCount,
  totalCount,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<Id<'savedUrlFolders'> | null>(null)
  const [editName, setEditName] = useState('')
  const [menuId, setMenuId] = useState<Id<'savedUrlFolders'> | null>(null)

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateFolder(newName.trim())
      setNewName('')
      setIsCreating(false)
    }
  }

  const handleRename = (id: Id<'savedUrlFolders'>) => {
    if (editName.trim()) {
      onRenameFolder(id, editName.trim())
      setEditingId(null)
    }
  }

  const itemClass = (active: boolean) =>
    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
      active ? 'bg-accent/10 text-accent border border-accent/20' : 'text-muted hover:text-foreground hover:bg-surface-hover'
    }`

  // Mobile: horizontal chip bar
  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <div className='hidden lg:flex flex-col gap-1 w-40 shrink-0'>
        <div
          className={itemClass(selectedFolderId === undefined)}
          onClick={() => onSelectFolder(undefined)}
        >
          <span>전체</span>
          <span className='text-[10px] opacity-60'>{totalCount}</span>
        </div>

        {folders.map((folder) => (
          <div key={folder._id} className='relative'>
            {editingId === folder._id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(folder._id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onBlur={() => handleRename(folder._id)}
                className='w-full px-3 py-2 rounded-lg text-xs bg-background border border-accent/40 text-foreground focus:outline-none'
              />
            ) : (
              <div
                className={itemClass(selectedFolderId === folder._id)}
                onClick={() => onSelectFolder(folder._id)}
              >
                <span className='truncate'>{folder.name}</span>
                <div className='flex items-center gap-1'>
                  <span className='text-[10px] opacity-60'>{folder.urlCount}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuId(menuId === folder._id ? null : folder._id)
                    }}
                    className='p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover'
                  >
                    <MoreHorizontal size={12} />
                  </button>
                </div>
              </div>
            )}

            {menuId === folder._id && (
              <>
                <div className='fixed inset-0 z-40' onClick={() => setMenuId(null)} />
                <div className='absolute left-full ml-1 top-0 z-50 w-32 bg-surface border border-border rounded-xl shadow-lg py-1'>
                  <button
                    onClick={() => {
                      setEditingId(folder._id)
                      setEditName(folder.name)
                      setMenuId(null)
                    }}
                    className='w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-surface-hover'
                  >
                    <Pencil size={12} />
                    이름 변경
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?\n내부 URL은 미분류로 이동됩니다.`)) {
                        onDeleteFolder(folder._id)
                      }
                      setMenuId(null)
                    }}
                    className='w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10'
                  >
                    <Trash2 size={12} />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {uncategorizedCount > 0 && (
          <div
            className={itemClass(selectedFolderId === 'uncategorized')}
            onClick={() => onSelectFolder('uncategorized')}
          >
            <span>미분류</span>
            <span className='text-[10px] opacity-60'>{uncategorizedCount}</span>
          </div>
        )}

        {isCreating ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setIsCreating(false)
            }}
            onBlur={() => {
              if (newName.trim()) handleCreate()
              else setIsCreating(false)
            }}
            placeholder='폴더 이름'
            className='px-3 py-2 rounded-lg text-xs bg-background border border-accent/40 text-foreground focus:outline-none placeholder:text-muted/50'
          />
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted hover:text-accent hover:bg-accent/5 transition-colors'
          >
            <FolderPlus size={13} />
            새 폴더
          </button>
        )}
      </div>

      {/* Mobile: horizontal chip bar */}
      <div className='flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1'>
        <button
          onClick={() => onSelectFolder(undefined)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            selectedFolderId === undefined
              ? 'bg-accent/10 border-accent/20 text-accent'
              : 'border-border text-muted hover:text-foreground'
          }`}
        >
          전체 ({totalCount})
        </button>
        {folders.map((f) => (
          <button
            key={f._id}
            onClick={() => onSelectFolder(f._id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedFolderId === f._id
                ? 'bg-accent/10 border-accent/20 text-accent'
                : 'border-border text-muted hover:text-foreground'
            }`}
          >
            {f.name} ({f.urlCount})
          </button>
        ))}
        {uncategorizedCount > 0 && (
          <button
            onClick={() => onSelectFolder('uncategorized')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedFolderId === 'uncategorized'
                ? 'bg-accent/10 border-accent/20 text-accent'
                : 'border-border text-muted hover:text-foreground'
            }`}
          >
            미분류 ({uncategorizedCount})
          </button>
        )}
        <button
          onClick={() => setIsCreating(true)}
          className='shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-border text-muted hover:text-accent hover:border-accent/40 transition-colors'
        >
          + 폴더
        </button>
      </div>
    </>
  )
}
