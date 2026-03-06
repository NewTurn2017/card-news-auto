'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, Bookmark, ExternalLink, Trash2, FolderInput, Copy, Check, Pencil } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id, Doc } from '../../../../convex/_generated/dataModel'
import SearchBar from './SearchBar'
import FolderSidebar from './FolderSidebar'
import AddUrlDialog from './AddUrlDialog'

type FolderFilter = Id<'savedUrlFolders'> | 'uncategorized' | undefined

type SavedSourceType = 'url' | 'youtube' | 'sns'

const SOURCE_LABELS: Record<SavedSourceType, string> = {
  url: 'URL',
  youtube: 'YouTube',
  sns: 'SNS',
}

interface SavedUrlsTabProps {
  onSelectUrl: (url: string, sourceType?: SavedSourceType) => void
}

export default function SavedUrlsTab({ onSelectUrl }: SavedUrlsTabProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<FolderFilter>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [moveMenuId, setMoveMenuId] = useState<Id<'savedUrls'> | null>(null)
  const [moveMenuPos, setMoveMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [copiedId, setCopiedId] = useState<Id<'savedUrls'> | null>(null)
  const [editingId, setEditingId] = useState<Id<'savedUrls'> | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const folderData = useQuery(api.savedUrlFolders.listFolders)
  const totalCount = useQuery(api.savedUrls.getTotalCount)

  const searchResults = useQuery(
    api.savedUrls.search,
    searchQuery ? { query: searchQuery } : 'skip'
  )
  const folderResults = useQuery(
    api.savedUrls.listByFolder,
    !searchQuery ? { folderId: selectedFolderId } : 'skip'
  )
  const urls: Doc<'savedUrls'>[] | undefined = searchQuery ? searchResults : folderResults

  const createFolder = useMutation(api.savedUrlFolders.createFolder)
  const renameFolder = useMutation(api.savedUrlFolders.renameFolder)
  const deleteFolderMut = useMutation(api.savedUrlFolders.deleteFolder)
  const removeUrl = useMutation(api.savedUrls.remove)
  const moveToFolder = useMutation(api.savedUrls.moveToFolder)
  const updateTitle = useMutation(api.savedUrls.updateTitle)

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (value) setSelectedFolderId(undefined)
  }, [])

  const getFolderName = (folderId?: Id<'savedUrlFolders'>) => {
    if (!folderId || !folderData) return undefined
    return folderData.folders.find((f: { _id: Id<'savedUrlFolders'>; name: string }) => f._id === folderId)?.name
  }

  const folders = folderData?.folders ?? []

  const handleCopyUrl = (id: Id<'savedUrls'>, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 600)
  }

  const startEditing = (id: Id<'savedUrls'>, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const saveTitle = (id: Id<'savedUrls'>) => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== '') {
      updateTitle({ id, title: trimmed })
    }
    setEditingId(null)
  }

  const openMoveMenu = (id: Id<'savedUrls'>, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMoveMenuPos({ top: rect.bottom + 4, left: rect.right - 144 })
    setMoveMenuId(id)
  }

  const closeMoveMenu = () => {
    setMoveMenuId(null)
    setMoveMenuPos(null)
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Top bar: search + add button */}
      <div className='flex items-center gap-3'>
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
        <button
          onClick={() => setShowAddDialog(true)}
          className='shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-background text-xs font-semibold hover:bg-accent-hover transition-colors'
        >
          <Plus size={14} />
          URL 추가
        </button>
      </div>

      {/* Folder sidebar + URL table */}
      <div className='flex gap-4'>
        <FolderSidebar
          folders={folders}
          uncategorizedCount={folderData?.uncategorizedCount ?? 0}
          totalCount={totalCount ?? 0}
          selectedFolderId={searchQuery ? undefined : selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={(name) => createFolder({ name })}
          onRenameFolder={(id, name) => renameFolder({ folderId: id, name })}
          onDeleteFolder={(id) => deleteFolderMut({ folderId: id })}
        />

        {/* URL Table */}
        <div className='flex-1 min-w-0'>
          {!urls || urls.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <Bookmark size={40} className='text-muted/30 mb-3' />
              <p className='text-sm font-medium text-muted'>
                {searchQuery
                  ? '검색 결과가 없습니다'
                  : '저장된 URL이 없습니다'}
              </p>
              <p className='text-xs text-muted/60 mt-1'>
                {searchQuery
                  ? '다른 검색어를 시도해보세요'
                  : 'URL을 추가하여 나만의 라이브러리를 만들어보세요'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddDialog(true)}
                  className='mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-background hover:bg-accent-hover transition-colors'
                >
                  첫 URL 추가하기
                </button>
              )}
            </div>
          ) : (
            <div className='border border-border rounded-xl'>
              {/* Table header */}
              <div className='hidden md:grid md:grid-cols-[1fr_160px_72px_56px_140px] gap-2 px-4 py-2.5 bg-surface border-b border-border text-[10px] font-semibold text-muted uppercase tracking-wider'>
                <span>제목</span>
                <span>URL</span>
                <span>분류</span>
                <span>소스</span>
                <span className='text-right'>액션</span>
              </div>

              {/* Table rows */}
              <div className='divide-y divide-border'>
                {urls.map((savedUrl) => {
                  const folderName = getFolderName(savedUrl.folderId as Id<'savedUrlFolders'> | undefined)
                  const st = (savedUrl.sourceType as SavedSourceType | undefined) ?? 'url'
                  let hostname = ''
                  try { hostname = new URL(savedUrl.url).hostname.replace('www.', '') } catch { /* */ }

                  return (
                    <div
                      key={savedUrl._id}
                      className='group flex flex-col md:grid md:grid-cols-[1fr_160px_72px_56px_140px] gap-1 md:gap-2 px-4 py-2.5 hover:bg-surface-hover/50 transition-colors items-center'
                    >
                      {/* Title - clickable / editable */}
                      {editingId === savedUrl._id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTitle(savedUrl._id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={() => saveTitle(savedUrl._id)}
                          className='w-full text-xs font-medium px-2 py-1 rounded-md bg-background border border-accent/40 text-foreground focus:outline-none min-w-0'
                        />
                      ) : (
                        <div className='flex items-center gap-1 min-w-0 w-full'>
                          <button
                            onClick={() => onSelectUrl(savedUrl.url, st)}
                            className='text-left min-w-0 flex-1'
                          >
                            <span className='text-xs font-medium text-foreground truncate block hover:text-accent transition-colors'>
                              {savedUrl.title}
                            </span>
                          </button>
                          <button
                            onClick={() => startEditing(savedUrl._id, savedUrl.title)}
                            className='shrink-0 p-1 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-surface-hover transition-all'
                            title='제목 수정'
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}

                      {/* URL */}
                      <span className='text-[11px] text-muted truncate block min-w-0 w-full' title={savedUrl.url}>
                        {hostname}
                      </span>

                      {/* Folder */}
                      <span className='text-[10px] text-muted/70 truncate'>
                        {folderName ?? '미분류'}
                      </span>

                      {/* Source type badge */}
                      <span className={`inline-flex items-center justify-center text-[10px] font-medium px-2 py-0.5 rounded-md w-fit ${
                        st === 'youtube' ? 'bg-red-500/10 text-red-400' :
                        st === 'sns' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {SOURCE_LABELS[st]}
                      </span>

                      {/* Actions */}
                      <div className='flex items-center justify-end gap-1'>
                        <a
                          href={savedUrl.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-colors'
                          title='새 탭에서 열기'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          onClick={() => handleCopyUrl(savedUrl._id, savedUrl.url)}
                          className='p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors'
                          title='URL 복사'
                        >
                          {copiedId === savedUrl._id ? (
                            <Check size={13} className='text-green-400' />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>

                        {/* Move to folder */}
                        <button
                          onClick={(e) => openMoveMenu(savedUrl._id, e)}
                          className='p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors'
                          title='폴더 이동'
                        >
                          <FolderInput size={13} />
                        </button>

                        <button
                          onClick={() => removeUrl({ id: savedUrl._id })}
                          className='p-1.5 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors'
                          title='삭제'
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Move to folder menu — fixed portal to avoid overflow clipping */}
      {moveMenuId && moveMenuPos && (
        <>
          <div className='fixed inset-0 z-40' onClick={closeMoveMenu} />
          <div
            className='fixed z-50 w-36 bg-surface border border-border rounded-xl shadow-lg py-1'
            style={{ top: moveMenuPos.top, left: moveMenuPos.left }}
          >
            <button
              onClick={() => { moveToFolder({ id: moveMenuId, folderId: undefined }); closeMoveMenu() }}
              className='w-full text-left px-3 py-1.5 text-xs text-muted hover:bg-surface-hover transition-colors'
            >
              미분류
            </button>
            {folders.map((f) => (
              <button
                key={f._id}
                onClick={() => { moveToFolder({ id: moveMenuId, folderId: f._id }); closeMoveMenu() }}
                className='w-full text-left px-3 py-1.5 text-xs text-muted hover:bg-surface-hover transition-colors'
              >
                {f.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Add URL Dialog */}
      <AddUrlDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        folders={folders}
      />
    </div>
  )
}
