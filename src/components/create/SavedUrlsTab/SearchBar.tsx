'use client'

import { useState, useEffect } from 'react'
import { SearchIcon, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue, onChange])

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <div className='relative flex-1'>
      <SearchIcon size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-muted' />
      <input
        type='text'
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder='제목, URL 검색...'
        className='w-full pl-9 pr-8 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors'
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('')
            onChange('')
          }}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground'
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
