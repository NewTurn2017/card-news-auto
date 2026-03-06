'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GenerationProgress from '@/components/generate/GenerationProgress'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { ExternalLink, Play, AtSign, SearchIcon, AlignJustify, Zap, Loader2, Bookmark } from 'lucide-react'
import GenerationPresetSelector from '@/components/create/GenerationPresetSelector'
import SavedUrlsTab from '@/components/create/SavedUrlsTab'

type SourceType = 'url' | 'sns' | 'search' | 'text' | 'youtube' | 'library'

const SOURCE_TABS: { id: SourceType; label: string; icon: ReactNode; desc: string }[] = [
  { id: 'url', label: 'URL', icon: <ExternalLink size={18} />, desc: '웹페이지, 뉴스, 블로그 URL' },
  { id: 'youtube', label: 'YouTube', icon: <Play size={18} />, desc: '영상 분석 → 카드뉴스 변환' },
  { id: 'sns', label: 'SNS', icon: <AtSign size={18} />, desc: 'Threads, Instagram, X' },
  { id: 'search', label: '검색', icon: <SearchIcon size={18} />, desc: '키워드로 AI 검색' },
  { id: 'text', label: '텍스트', icon: <AlignJustify size={18} />, desc: '직접 내용 입력' },
  { id: 'library', label: '라이브러리', icon: <Bookmark size={18} />, desc: '저장된 URL에서 빠르게 수집' },
]

const SNS_PLATFORMS = [
  { id: 'threads', label: 'Threads', color: '#000' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'x', label: 'X (Twitter)', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
]

const SAMPLE_TEXT = `인공지능(AI)이 바둑에서 인간을 이긴 지 10년이 지났다. 2016년 3월, 구글 딥마인드의 알파고는 세계 최정상급 바둑 기사 이세돌 9단을 4대1로 이겼다. 당시 전 세계는 충격에 빠졌고, AI의 가능성에 대한 논의가 본격화됐다.

10년이 지난 지금, 이세돌 9단이 처음으로 입을 열었다. 그는 "AI와의 대국은 인생에서 가장 값진 경험이었다"고 말했다.

이세돌은 현재 바둑 교육과 AI 연구에 관심을 갖고 있으며, "AI는 인간의 적이 아니라 거울"이라고 강조했다.`

export default function CreatePage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<SourceType>('url')
  const [projectId, setProjectId] = useState<Id<'projects'> | null>(null)
  const [selectedSlideCount, setSelectedSlideCount] = useState(7)
  const [selectedPresetId, setSelectedPresetId] = useState<Id<'generationPresets'> | null>(null)

  // URL input state
  const [url, setUrl] = useState('')

  // SNS input state
  const [snsPlatform, setSnsPlatform] = useState('threads')
  const [snsUsername, setSnsUsername] = useState('')
  const [snsLimit, setSnsLimit] = useState(5)

  // Search input state
  const [searchQuery, setSearchQuery] = useState('')

  // YouTube input state
  const [youtubeUrl, setYoutubeUrl] = useState('')

  // Text input state
  const [textContent, setTextContent] = useState('')

  // Source preview state
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [isCollecting, setIsCollecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to project for real-time progress
  const project = useQuery(api.projects.getProject, projectId ? { projectId } : 'skip')
  const hasApiKey = useQuery(api.userProfiles.hasApiKey)

  const createProjectMutation = useMutation(api.projects.createProject)
  const collectFromUrl = useAction(api.actions.collect.collectFromUrl)
  const collectFromSns = useAction(api.actions.collect.collectFromSns)
  const collectFromSearch = useAction(api.actions.collect.collectFromSearch)
  const collectFromYoutube = useAction(api.actions.collect.collectFromYoutube)
  const generateCardNews = useAction(api.actions.generate.generateCardNews)
  const updateProject = useMutation(api.projects.updateProject)

  // Map Convex status to GenerationProgress status
  const convexToProgressStatus = (status?: string) => {
    if (status === 'collecting') return 'planning' as const
    if (status === 'generating') return 'writing' as const
    if (status === 'completed') return 'done' as const
    return 'idle' as const
  }

  const isGenerating = project?.status === 'collecting' || project?.status === 'generating'
  const generationStatus = convexToProgressStatus(project?.status)
  const generationProgress = project?.generationProgress ?? 0

  // Watch project status for redirect
  useEffect(() => {
    if (project?.status === 'completed' && projectId) {
      router.push(`/edit/${projectId}`)
    }
  }, [project?.status, projectId, router])

  const handleCollect = async () => {
    if (activeTab === 'library') return // library tab handles its own flow
    if (activeTab !== 'text' && !hasApiKey) {
      router.push('/settings')
      return
    }
    setIsCollecting(true)
    setSourcePreview(null)
    setError(null)

    try {
      const collectableTab = activeTab as Exclude<SourceType, 'library'>
      const titleMap: Record<Exclude<SourceType, 'library'>, string> = {
        url: '새 카드뉴스',
        youtube: '새 카드뉴스',
        sns: `@${snsUsername}`,
        search: searchQuery,
        text: '텍스트 입력',
      }
      const inputMap: Record<Exclude<SourceType, 'library'>, string> = {
        url: url,
        youtube: youtubeUrl,
        sns: snsUsername,
        search: searchQuery,
        text: textContent.slice(0, 100),
      }
      const id = await createProjectMutation({
        title: titleMap[collectableTab],
        sourceType: collectableTab,
        sourceInput: inputMap[collectableTab],
      })
      setProjectId(id)

      if (activeTab === 'text') {
        await updateProject({ projectId: id, sourceContent: textContent, status: 'draft' })
        setSourcePreview(textContent)
      } else if (activeTab === 'youtube') {
        const result = await collectFromYoutube({ projectId: id, youtubeUrl })
        setSourcePreview(result.summary)
      } else if (activeTab === 'url') {
        const result = await collectFromUrl({ projectId: id, url })
        setSourcePreview(result.summary)
      } else if (activeTab === 'sns') {
        const result = await collectFromSns({
          projectId: id,
          platform: snsPlatform as 'threads' | 'instagram' | 'facebook' | 'x',
          username: snsUsername,
          limit: snsLimit,
        })
        setSourcePreview(result.summary)
      } else if (activeTab === 'search') {
        const result = await collectFromSearch({ projectId: id, query: searchQuery })
        setSourcePreview(result.content)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const data = (err as { data?: string })?.data
      if (data === 'API_KEY_INVALID' || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        setError('API_KEY_INVALID')
      } else if (data === 'API_KEY_REQUIRED' || msg.includes('API_KEY_REQUIRED')) {
        setError('API_KEY')
      } else {
        setError(msg)
      }
      // Reset project status so UI doesn't stay stuck on "collecting"
      if (projectId) {
        await updateProject({ projectId, status: 'draft' }).catch(() => {})
      }
      console.error('Collection error:', err)
    } finally {
      setIsCollecting(false)
    }
  }

  const [isStartingGeneration, setIsStartingGeneration] = useState(false)

  const handleGenerate = async () => {
    if (!projectId || !sourcePreview) return
    if (!hasApiKey) {
      router.push('/settings')
      return
    }
    setError(null)
    setIsStartingGeneration(true)
    try {
      await generateCardNews({
        projectId,
        slideCount: selectedSlideCount,
        presetId: selectedPresetId ?? undefined,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const data = (err as { data?: string })?.data
      if (data === 'API_KEY_INVALID' || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        setError('API_KEY_INVALID')
      } else if (data === 'API_KEY_REQUIRED' || msg.includes('API_KEY_REQUIRED')) {
        setError('API_KEY')
      } else {
        setError(msg)
      }
      console.error('Generation error:', err)
    }
  }

  const handleCancel = () => {
    setProjectId(null)
    setSourcePreview(null)
  }

  const canCollect = () => {
    if (activeTab === 'url') return url.trim().length > 0
    if (activeTab === 'youtube')
      return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]+/.test(
        youtubeUrl.trim()
      )
    if (activeTab === 'sns') return snsUsername.trim().length > 0
    if (activeTab === 'search') return searchQuery.trim().length > 0
    if (activeTab === 'text') return textContent.trim().length > 20
    if (activeTab === 'library') return false // library has its own selection flow
    return false
  }

  if (isGenerating) {
    return (
      <div className='flex items-center justify-center min-h-full p-8'>
        <div className='w-full max-w-md'>
          <GenerationProgress
            status={generationStatus}
            progress={generationProgress}
            onCancel={handleCancel}
          />
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-full bg-background'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-8 py-4 md:py-5'>
        <div className='max-w-3xl mx-auto'>
          <h1 className='text-lg md:text-xl font-black text-foreground'>새 카드뉴스 만들기</h1>
          <p className='text-xs md:text-sm text-muted mt-0.5'>
            소스를 선택하고 AI가 자동으로 생성합니다
          </p>
        </div>
      </div>

      <div className='max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8'>
        {/* Step indicator */}
        <div className='flex items-center gap-2 md:gap-3 mb-6 md:mb-8'>
          {[
            { num: '1', label: '소스 선택', active: !sourcePreview },
            { num: '2', label: '내용 확인', active: !!sourcePreview },
            { num: '3', label: '생성', active: false },
          ].map((step, i) => (
            <div key={step.num} className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.active
                      ? 'bg-accent text-background'
                      : sourcePreview && i === 0
                        ? 'bg-accent/30 text-accent border border-accent/40'
                        : 'bg-surface border border-border text-muted'
                  }`}
                >
                  {sourcePreview && i === 0 ? '✓' : step.num}
                </div>
                <span
                  className={`text-sm font-medium ${
                    step.active ? 'text-foreground' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < 2 && <div className='flex-1 h-px bg-border w-8' />}
            </div>
          ))}
        </div>

        {/* Source selector tabs */}
        {!sourcePreview ? (
          <div className='flex flex-col gap-6'>
            {/* Tab bar */}
            <div className='flex gap-1 md:gap-2 p-1 bg-surface rounded-2xl border border-border overflow-x-auto'>
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 md:gap-1 py-2.5 md:py-3 px-1.5 md:px-2 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-background border border-border shadow-sm text-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  <span className='text-base md:text-lg'>{tab.icon}</span>
                  <span className='text-[10px] md:text-xs font-semibold whitespace-nowrap'>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab description */}
            <div className='flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/50 border border-border'>
              <span className='text-lg'>{SOURCE_TABS.find((t) => t.id === activeTab)?.icon}</span>
              <span className='text-sm text-muted'>
                {SOURCE_TABS.find((t) => t.id === activeTab)?.desc}
              </span>
            </div>

            {/* Input area — hidden when library tab is active (rendered full-width below) */}
            {activeTab !== 'library' && (
            <div className='rounded-2xl border border-border bg-surface p-4 md:p-6'>
              {activeTab === 'url' && (
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                      웹페이지 URL
                    </label>
                    <input
                      type='url'
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder='https://example.com/article'
                      className='px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
                    />
                    <p className='text-xs text-muted'>
                      뉴스 기사, 블로그 포스트, 공식 문서 등 어떤 URL이든 가능합니다
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'youtube' && (
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                      YouTube URL
                    </label>
                    <input
                      type='url'
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder='https://www.youtube.com/watch?v=...'
                      className='px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
                    />
                    <p className='text-xs text-muted'>
                      Gemini AI가 영상의 시각 + 음성을 동시에 분석하여 카드뉴스 소스를 추출합니다
                    </p>
                  </div>
                  <div className='flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20'>
                    <span className='text-accent text-xs'>&#9432;</span>
                    <span className='text-xs text-muted'>
                      일반 영상, Shorts 모두 지원 · 비공개/연령제한 영상은 분석 불가
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'sns' && (
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                      플랫폼 선택
                    </label>
                    <div className='grid grid-cols-2 gap-2'>
                      {SNS_PLATFORMS.map((platform) => (
                        <button
                          key={platform.id}
                          onClick={() => setSnsPlatform(platform.id)}
                          className={`py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                            snsPlatform === platform.id
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-border bg-background text-muted hover:border-border/80 hover:text-foreground'
                          }`}
                        >
                          {platform.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                      사용자명
                    </label>
                    <div className='flex items-center gap-0 rounded-xl bg-background border border-border overflow-hidden focus-within:border-accent/60 transition-colors'>
                      <span className='px-4 py-3.5 text-muted text-sm border-r border-border'>
                        @
                      </span>
                      <input
                        type='text'
                        value={snsUsername}
                        onChange={(e) => setSnsUsername(e.target.value.replace('@', ''))}
                        placeholder='username'
                        className='flex-1 px-4 py-3.5 bg-transparent text-foreground text-sm placeholder:text-muted/50 focus:outline-none'
                      />
                    </div>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                      게시물 수: {snsLimit}개
                    </label>
                    <input
                      type='range'
                      min={1}
                      max={20}
                      value={snsLimit}
                      onChange={(e) => setSnsLimit(Number(e.target.value))}
                      className='w-full accent-accent'
                    />
                    <div className='flex justify-between text-xs text-muted'>
                      <span>1개</span>
                      <span>20개</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'search' && (
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                      검색어
                    </label>
                    <input
                      type='text'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='예: AI 트렌드 2026, NextJS 신기능, 마케팅 전략'
                      className='px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
                    />
                    <p className='text-xs text-muted'>
                      WithGenie Search API로 최신 정보를 수집합니다 (fallback: Gemini Search)
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {['AI 트렌드 2026', '인스타 마케팅', '스타트업 피칭', 'Next.js 16'].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setSearchQuery(suggestion)}
                          className='px-3 py-1.5 rounded-lg bg-background border border-border text-muted text-xs hover:border-accent/40 hover:text-accent transition-colors'
                        >
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'text' && (
                <div className='flex flex-col gap-4'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs font-semibold text-muted uppercase tracking-wider'>
                      내용 입력
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder='카드뉴스로 만들 내용을 입력하세요. 기사, 보고서, 아이디어 등 어떤 형식이든 가능합니다.'
                      rows={8}
                      className='px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors resize-none leading-relaxed'
                    />
                    <div className='flex items-center justify-between'>
                      <p className='text-xs text-muted'>{textContent.length}자</p>
                      <button
                        onClick={() => setTextContent(SAMPLE_TEXT)}
                        className='text-xs text-accent hover:underline'
                      >
                        예시 불러오기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Error message */}
            {activeTab !== 'library' && error && (
              <div className='px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm'>
                {error === 'API_KEY' ? (
                  <div className='flex flex-col gap-2'>
                    <span className='text-red-400 font-medium'>Gemini API Key가 설정되지 않았습니다.</span>
                    <span className='text-red-400/70 text-xs'>설정 페이지에서 API Key를 등록해주세요.</span>
                    <Link
                      href='/settings'
                      className='self-start px-3 py-1.5 text-xs font-semibold bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors'
                    >
                      설정으로 이동
                    </Link>
                  </div>
                ) : error === 'API_KEY_INVALID' ? (
                  <div className='flex flex-col gap-2'>
                    <span className='text-red-400 font-medium'>Gemini API Key가 유효하지 않습니다.</span>
                    <span className='text-red-400/70 text-xs'>
                      입력한 API Key가 만료되었거나 잘못되었습니다. Google AI Studio에서 새 키를 발급받거나 기존 키를 확인해주세요.
                    </span>
                    <div className='flex gap-2'>
                      <Link
                        href='/settings'
                        className='px-3 py-1.5 text-xs font-semibold bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors'
                      >
                        키 재설정
                      </Link>
                      <a
                        href='https://aistudio.google.com/apikey'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='px-3 py-1.5 text-xs font-semibold border border-border text-muted rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors'
                      >
                        AI Studio에서 발급 ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <span className='text-red-400'>{error}</span>
                )}
              </div>
            )}

            {/* Collect button */}
            {activeTab !== 'library' && (
              <button
                onClick={handleCollect}
                disabled={!canCollect() || isCollecting}
                className='w-full py-4 bg-accent text-background font-bold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]'
              >
                {isCollecting ? (
                  <span className='flex items-center justify-center gap-3'>
                    <span className='w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin' />
                    {activeTab === 'text' ? '내용 확인 중...' : '수집 중...'}
                  </span>
                ) : (
                  <span>{activeTab === 'text' ? '내용 확인' : '소스 수집 시작'} →</span>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Source preview + generate */
          <div className='flex flex-col gap-6'>
            {/* Source info header */}
            <div className='flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border'>
              <span className='text-lg'>{SOURCE_TABS.find((t) => t.id === activeTab)?.icon}</span>
              <div className='flex-1'>
                <p className='text-xs text-muted'>소스 타입</p>
                <p className='text-sm font-semibold text-foreground'>
                  {SOURCE_TABS.find((t) => t.id === activeTab)?.label}
                  {activeTab === 'url' && ` — ${url}`}
                  {activeTab === 'youtube' && ` — ${youtubeUrl}`}
                  {activeTab === 'sns' && ` — @${snsUsername}`}
                  {activeTab === 'search' && ` — "${searchQuery}"`}
                </p>
              </div>
              <button
                onClick={() => {
                  setSourcePreview(null)
                  setProjectId(null)
                }}
                className='text-xs text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover'
              >
                다시 선택
              </button>
            </div>

            {/* Source preview */}
            <div className='rounded-2xl border border-border bg-surface p-4 md:p-6'>
              <p className='text-xs font-semibold text-muted uppercase tracking-wider mb-3'>
                수집된 내용 미리보기
              </p>
              <div className='max-h-64 overflow-y-auto'>
                <p className='text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap'>
                  {sourcePreview}
                </p>
              </div>
            </div>

            {/* Generation options */}
            <div className='rounded-2xl border border-border bg-surface p-4 md:p-6'>
              <p className='text-xs font-semibold text-muted uppercase tracking-wider mb-4'>
                생성 옵션
              </p>
              <div className='flex flex-col gap-5'>
                {/* Preset selector */}
                <GenerationPresetSelector
                  selectedPresetId={selectedPresetId}
                  onSelect={setSelectedPresetId}
                />

                {/* Slide count slider */}
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between'>
                    <label className='text-sm text-muted'>슬라이드 수</label>
                    <span className='text-sm font-bold text-accent'>{selectedSlideCount}장</span>
                  </div>
                  <input
                    type='range'
                    min={1}
                    max={10}
                    value={selectedSlideCount}
                    onChange={(e) => setSelectedSlideCount(Number(e.target.value))}
                    className='w-full accent-accent'
                  />
                  <div className='flex justify-between text-xs text-muted'>
                    <span>1장</span>
                    <span>10장</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isStartingGeneration || isGenerating}
              className='w-full py-4 bg-accent text-background font-bold text-base rounded-xl hover:bg-accent-hover transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-accent/20 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2'
            >
              {isStartingGeneration || isGenerating ? (
                <>
                  <Loader2 size={18} className='animate-spin' />
                  AI 생성 준비 중...
                </>
              ) : (
                <>
                  AI 카드뉴스 생성 시작 <Zap size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Library — full-width outside max-w-3xl */}
      {!sourcePreview && activeTab === 'library' && (
        <div className='px-4 md:px-8 pb-8'>
          <SavedUrlsTab
            onSelectUrl={(selectedUrl, sourceType) => {
              if (sourceType === 'youtube') {
                setYoutubeUrl(selectedUrl)
                setActiveTab('youtube')
              } else if (sourceType === 'sns') {
                setUrl(selectedUrl)
                setActiveTab('sns')
              } else {
                setUrl(selectedUrl)
                setActiveTab('url')
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
