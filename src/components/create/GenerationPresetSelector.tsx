'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Plus, Pencil, Trash2, Star, X } from 'lucide-react'
import {
  TONE_OPTIONS,
  WRITING_STYLE_OPTIONS,
  CONTENT_LENGTH_OPTIONS,
} from '@/data/generationOptions'

interface GenerationPresetSelectorProps {
  selectedPresetId: Id<'generationPresets'> | null
  onSelect: (presetId: Id<'generationPresets'> | null) => void
}

export default function GenerationPresetSelector({
  selectedPresetId,
  onSelect,
}: GenerationPresetSelectorProps) {
  const presets = useQuery(api.generationPresets.list)
  const savePreset = useMutation(api.generationPresets.save)
  const updatePreset = useMutation(api.generationPresets.update)
  const removePreset = useMutation(api.generationPresets.remove)
  const setDefaultPreset = useMutation(api.generationPresets.setDefault)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPresetId, setEditingPresetId] = useState<Id<'generationPresets'> | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formTone, setFormTone] = useState('professional')
  const [formCustomTone, setFormCustomTone] = useState('')
  const [formWritingStyle, setFormWritingStyle] = useState('concise')
  const [formCustomWritingStyle, setFormCustomWritingStyle] = useState('')
  const [formContentLength, setFormContentLength] = useState('medium')
  const [formTargetAudience, setFormTargetAudience] = useState('')
  const [formAdditionalInstructions, setFormAdditionalInstructions] = useState('')

  const resetForm = () => {
    setFormName('')
    setFormTone('professional')
    setFormCustomTone('')
    setFormWritingStyle('concise')
    setFormCustomWritingStyle('')
    setFormContentLength('medium')
    setFormTargetAudience('')
    setFormAdditionalInstructions('')
    setEditingPresetId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (presetId: Id<'generationPresets'>) => {
    const preset = presets?.find((p) => p._id === presetId)
    if (!preset) return
    setEditingPresetId(presetId)
    setFormName(preset.name)

    // Check if tone is a predefined option or custom
    const isPredefinedTone = TONE_OPTIONS.some((o) => o.id === preset.tone)
    setFormTone(isPredefinedTone ? preset.tone : 'custom')
    setFormCustomTone(isPredefinedTone ? '' : preset.tone)

    const isPredefinedStyle = WRITING_STYLE_OPTIONS.some((o) => o.id === preset.writingStyle)
    setFormWritingStyle(isPredefinedStyle ? preset.writingStyle : 'custom')
    setFormCustomWritingStyle(isPredefinedStyle ? '' : preset.writingStyle)

    setFormContentLength(preset.contentLength)
    setFormTargetAudience(preset.targetAudience ?? '')
    setFormAdditionalInstructions(preset.additionalInstructions ?? '')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    const tone = formTone === 'custom' ? formCustomTone.trim() : formTone
    const writingStyle =
      formWritingStyle === 'custom' ? formCustomWritingStyle.trim() : formWritingStyle

    if (!formName.trim() || !tone || !writingStyle) return

    const data = {
      name: formName.trim(),
      tone,
      writingStyle,
      contentLength: formContentLength,
      targetAudience: formTargetAudience.trim() || undefined,
      additionalInstructions: formAdditionalInstructions.trim() || undefined,
    }

    if (editingPresetId) {
      await updatePreset({ presetId: editingPresetId, ...data })
    } else {
      await savePreset(data)
    }

    setIsModalOpen(false)
    resetForm()
  }

  const handleDelete = async (presetId: Id<'generationPresets'>) => {
    if (selectedPresetId === presetId) onSelect(null)
    await removePreset({ presetId })
  }

  const handleSetDefault = async (presetId: Id<'generationPresets'>) => {
    await setDefaultPreset({ presetId })
  }

  const selectedPreset = presets?.find((p) => p._id === selectedPresetId)

  // Find label for a tone/style value
  const getToneLabel = (value: string) =>
    TONE_OPTIONS.find((o) => o.id === value)?.label ?? value
  const getStyleLabel = (value: string) =>
    WRITING_STYLE_OPTIONS.find((o) => o.id === value)?.label ?? value
  const getLengthLabel = (value: string) =>
    CONTENT_LENGTH_OPTIONS.find((o) => o.id === value)?.label ?? value

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <label className='text-sm text-muted'>내 스타일 (선택사항)</label>
        {selectedPresetId && (
          <button
            onClick={() => onSelect(null)}
            className='text-xs text-muted hover:text-foreground transition-colors'
          >
            선택 해제
          </button>
        )}
      </div>

      {/* Preset cards */}
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {presets?.map((preset) => (
          <div
            key={preset._id}
            onClick={() => onSelect(preset._id)}
            className={`relative flex-shrink-0 w-36 p-3 rounded-xl border cursor-pointer transition-all group ${
              selectedPresetId === preset._id
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-background text-muted hover:border-accent/40 hover:text-foreground'
            }`}
          >
            {preset.isDefault && (
              <Star size={10} className='absolute top-2 right-2 fill-accent text-accent' />
            )}
            <p className='text-xs font-semibold truncate mb-1'>{preset.name}</p>
            <p className='text-[10px] text-muted truncate'>
              {getToneLabel(preset.tone)} · {getStyleLabel(preset.writingStyle)}
            </p>
            {/* Action buttons on hover */}
            <div className='absolute bottom-1.5 right-1.5 hidden group-hover:flex gap-1'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetDefault(preset._id)
                }}
                className='p-1 rounded-md bg-surface hover:bg-surface-hover transition-colors'
                title='기본 설정'
              >
                <Star size={10} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openEditModal(preset._id)
                }}
                className='p-1 rounded-md bg-surface hover:bg-surface-hover transition-colors'
                title='편집'
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(preset._id)
                }}
                className='p-1 rounded-md bg-surface hover:bg-red-500/20 text-red-400 transition-colors'
                title='삭제'
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}

        {/* Add button */}
        <button
          onClick={openCreateModal}
          className='flex-shrink-0 w-36 p-3 rounded-xl border border-dashed border-border bg-background text-muted hover:border-accent/40 hover:text-accent transition-all flex flex-col items-center justify-center gap-1'
        >
          <Plus size={16} />
          <span className='text-xs font-medium'>만들기</span>
        </button>
      </div>

      {/* Selected preset summary */}
      {selectedPreset && (
        <div className='px-3 py-2 rounded-lg bg-accent/5 border border-accent/20'>
          <p className='text-xs text-muted'>
            <span className='text-accent font-medium'>{selectedPreset.name}</span>
            {' — '}
            {getToneLabel(selectedPreset.tone)} · {getStyleLabel(selectedPreset.writingStyle)} ·{' '}
            {getLengthLabel(selectedPreset.contentLength)}
            {selectedPreset.targetAudience && ` · ${selectedPreset.targetAudience}`}
          </p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto'>
            {/* Modal header */}
            <div className='flex items-center justify-between p-4 border-b border-border'>
              <h3 className='text-sm font-bold text-foreground'>
                {editingPresetId ? '스타일 편집' : '내 스타일 만들기'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
                className='p-1 rounded-lg hover:bg-surface-hover transition-colors text-muted'
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className='p-4 flex flex-col gap-5'>
              {/* Name */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                  이름 *
                </label>
                <input
                  type='text'
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder='예: 전문적인 IT 뉴스'
                  className='px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
                  maxLength={30}
                />
              </div>

              {/* Tone */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                  말투
                </label>
                <div className='flex flex-wrap gap-2'>
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFormTone(opt.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        formTone === opt.id
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-background text-muted hover:border-accent/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setFormTone('custom')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      formTone === 'custom'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-background text-muted hover:border-accent/40'
                    }`}
                  >
                    직접 입력
                  </button>
                </div>
                {formTone === 'custom' && (
                  <input
                    type='text'
                    value={formCustomTone}
                    onChange={(e) => setFormCustomTone(e.target.value)}
                    placeholder='원하는 말투를 입력하세요'
                    className='mt-1 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
                    maxLength={50}
                  />
                )}
              </div>

              {/* Writing Style */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                  글쓰기 스타일
                </label>
                <div className='flex flex-wrap gap-2'>
                  {WRITING_STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFormWritingStyle(opt.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        formWritingStyle === opt.id
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-background text-muted hover:border-accent/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setFormWritingStyle('custom')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      formWritingStyle === 'custom'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-background text-muted hover:border-accent/40'
                    }`}
                  >
                    직접 입력
                  </button>
                </div>
                {formWritingStyle === 'custom' && (
                  <input
                    type='text'
                    value={formCustomWritingStyle}
                    onChange={(e) => setFormCustomWritingStyle(e.target.value)}
                    placeholder='원하는 글쓰기 스타일을 입력하세요'
                    className='mt-1 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
                    maxLength={50}
                  />
                )}
              </div>

              {/* Content Length */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                  글자수
                </label>
                <div className='flex gap-2'>
                  {CONTENT_LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFormContentLength(opt.id)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        formContentLength === opt.id
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-background text-muted hover:border-accent/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                  대상 독자 (선택)
                </label>
                <input
                  type='text'
                  value={formTargetAudience}
                  onChange={(e) => setFormTargetAudience(e.target.value)}
                  placeholder='예: 일반인, MZ세대, 개발자'
                  className='px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
                  maxLength={30}
                />
              </div>

              {/* Additional Instructions */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                  추가 지시사항 (선택)
                </label>
                <textarea
                  value={formAdditionalInstructions}
                  onChange={(e) => setFormAdditionalInstructions(e.target.value)}
                  placeholder='예: 이모지를 많이 사용해주세요, 숫자 데이터를 강조해주세요'
                  rows={2}
                  className='px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors resize-none'
                  maxLength={200}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className='p-4 border-t border-border'>
              <button
                onClick={handleSave}
                disabled={
                  !formName.trim() ||
                  (formTone === 'custom' && !formCustomTone.trim()) ||
                  (formWritingStyle === 'custom' && !formCustomWritingStyle.trim())
                }
                className='w-full py-3 bg-accent text-background font-bold text-sm rounded-xl hover:bg-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed'
              >
                {editingPresetId ? '수정하기' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
