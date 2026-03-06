'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type SavedSourceType = 'url' | 'youtube' | 'sns'

const SOURCE_OPTIONS: { id: SavedSourceType; label: string }[] = [
  { id: 'url', label: 'URL' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'sns', label: 'SNS' },
]

interface AddUrlDialogProps {
  open: boolean
  onClose: () => void
  folders: { _id: Id<'savedUrlFolders'>; name: string }[]
}

export default function AddUrlDialog({ open, onClose, folders }: AddUrlDialogProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<SavedSourceType>('url')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [isManual, setIsManual] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractAndSave = useAction(api.actions.savedUrls.extractAndSave)
  const createSavedUrl = useMutation(api.savedUrls.create)

  const handleSubmit = async () => {
    if (!url.trim()) return
    setIsExtracting(true)
    setError(null)

    try {
      const folderId = selectedFolderId ? (selectedFolderId as Id<'savedUrlFolders'>) : undefined

      if (isManual) {
        await createSavedUrl({
          url: url.trim(),
          title: title.trim() || url.trim(),
          sourceType,
          folderId,
        })
      } else {
        await extractAndSave({
          url: url.trim(),
          sourceType,
          folderId,
        })
      }
      resetAndClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL 저장에 실패했습니다.')
    } finally {
      setIsExtracting(false)
    }
  }

  const resetAndClose = () => {
    setUrl('')
    setTitle('')
    setSourceType('url')
    setSelectedFolderId('')
    setIsManual(false)
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/50' onClick={resetAndClose} />

      <div className='relative z-10 w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
          <h3 className='text-sm font-bold text-foreground'>URL 추가</h3>
          <button onClick={resetAndClose} className='text-muted hover:text-foreground transition-colors'>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className='px-5 py-5 flex flex-col gap-4'>
          {/* Source type */}
          <div className='flex flex-col gap-2'>
            <label className='text-xs font-semibold text-muted uppercase tracking-wider'>소스 종류</label>
            <div className='flex gap-2'>
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSourceType(opt.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    sourceType === opt.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL */}
          <div className='flex flex-col gap-2'>
            <label className='text-xs font-semibold text-muted uppercase tracking-wider'>URL</label>
            <input
              type='url'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                sourceType === 'youtube'
                  ? 'https://youtube.com/watch?v=...'
                  : sourceType === 'sns'
                    ? 'https://threads.net/@user/post/...'
                    : 'https://example.com/article'
              }
              autoFocus
              className='px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isExtracting) handleSubmit()
              }}
            />
          </div>

          {/* Manual mode toggle */}
          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='checkbox'
              checked={isManual}
              onChange={(e) => setIsManual(e.target.checked)}
              className='accent-accent w-3.5 h-3.5'
            />
            <span className='text-xs text-muted'>직접 입력 (자동 추출 없이 제목 직접 설정)</span>
          </label>

          {/* Manual title input */}
          {isManual && (
            <div className='flex flex-col gap-2'>
              <label className='text-xs font-semibold text-muted uppercase tracking-wider'>제목</label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='URL 제목을 입력하세요'
                className='px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
              />
            </div>
          )}

          {/* Folder */}
          <div className='flex flex-col gap-2'>
            <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
              폴더 (선택)
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className='px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/60 transition-colors'
            >
              <option value=''>미분류</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className='text-xs text-red-400 px-1'>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-2 px-5 py-4 border-t border-border'>
          <button
            onClick={resetAndClose}
            className='px-4 py-2.5 rounded-xl text-xs font-semibold text-muted border border-border hover:text-foreground hover:bg-surface-hover transition-colors'
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim() || isExtracting}
            className='px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent text-background hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2'
          >
            {isExtracting ? (
              <>
                <Loader2 size={14} className='animate-spin' />
                {isManual ? '저장 중...' : '추출 중...'}
              </>
            ) : (
              isManual ? '저장' : '추출 후 추가'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
