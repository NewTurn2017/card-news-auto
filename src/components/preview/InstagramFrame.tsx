'use client'

import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Home,
  Search,
  Grid3X3,
  Clapperboard,
  CircleUserRound,
  MoreHorizontal,
} from 'lucide-react'
import SlideIndicator from './SlideIndicator'

interface InstagramFrameProps {
  profileName: string
  children: React.ReactNode
  totalSlides: number
  currentSlide: number
  onSlideSelect: (index: number) => void
}

export default function InstagramFrame({
  profileName,
  children,
  totalSlides,
  currentSlide,
  onSlideSelect,
}: InstagramFrameProps) {
  const initial = profileName.charAt(0).toUpperCase()

  return (
    <div className='flex flex-col bg-black'>
      {/* Profile header */}
      <div className='flex items-center gap-2.5 px-3 py-2'>
        <div className='relative'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-xs font-bold text-white'>
            {initial}
          </div>
          <div className='absolute inset-0 rounded-full ring-2 ring-black' />
        </div>
        <span className='text-[13px] font-semibold text-white'>{profileName}</span>
        <MoreHorizontal size={16} className='ml-auto text-white/80' />
      </div>

      {/* Card content */}
      <div className='relative'>{children}</div>

      {/* Action bar */}
      <div className='flex flex-col gap-1.5 px-3 py-2'>
        <div className='flex items-center'>
          <div className='flex gap-3.5 text-white'>
            <Heart size={22} strokeWidth={1.8} fill="#ff3040" className="text-[#ff3040]" />
            <MessageCircle size={22} strokeWidth={1.8} className='-scale-x-100' />
            <Send size={22} strokeWidth={1.8} />
          </div>
          <div className='mx-auto'>
            <SlideIndicator total={totalSlides} current={currentSlide} onSelect={onSlideSelect} />
          </div>
          <Bookmark size={22} strokeWidth={1.8} className='text-white' />
        </div>
        <p className='text-[13px] font-semibold text-white'>@ai_developer_genie</p>
      </div>

      {/* Bottom nav */}
      <div className='flex items-center justify-around border-t border-white/10 py-2 text-white'>
        <Home size={22} strokeWidth={2} />
        <Search size={22} strokeWidth={2} />
        <Grid3X3 size={22} strokeWidth={1.5} />
        <Clapperboard size={22} strokeWidth={1.5} />
        <CircleUserRound size={22} strokeWidth={1.5} />
      </div>
    </div>
  )
}
