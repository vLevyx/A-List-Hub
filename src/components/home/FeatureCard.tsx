'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  title: string
  href: string
  requiresAccess: boolean
  hasAccess: boolean
  tag?: string
  tagType?: 'new' | 'updated'
  external?: boolean
}

export function FeatureCard({
  title,
  href,
  requiresAccess,
  hasAccess,
  tag,
  tagType,
  external = false
}: FeatureCardProps) {
  const isLocked = requiresAccess && !hasAccess
  
  const cardContent = (
    <div
      className={cn(
        'relative p-4 rounded-lg border transition-all duration-300 group',
        isLocked
          ? 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed'
          : 'bg-gradient-to-br from-primary-500/10 to-primary-600/10 border-primary-500/20 hover:border-primary-500/40 hover:bg-gradient-to-br hover:from-primary-500/20 hover:to-primary-600/20 cursor-pointer transform hover:-translate-y-1 hover:shadow-lg'
      )}
    >
      {tag && (
        <span
          className={cn(
            'absolute -top-2 -right-2 text-xs font-bold px-2 py-1 rounded-full',
            tagType === 'new' 
              ? 'bg-green-500 text-black' 
              : 'bg-yellow-500 text-black'
          )}
        >
          {tag}
        </span>
      )}
      
      <div className="flex items-center justify-between">
        <span className={cn(
          'font-semibold',
          isLocked ? 'text-white/50' : 'text-white group-hover:text-primary-400'
        )}>
          {title}
        </span>
        
        {isLocked && (
          <Lock className="w-4 h-4 text-primary-500" />
        )}
      </div>
    </div>
  )

  if (isLocked) {
    return cardContent
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {cardContent}
      </a>
    )
  }

  return (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  )
}