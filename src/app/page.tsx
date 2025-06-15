'use client'

import { usePageTracking } from '@/hooks/usePageTracking'
import { HeroSection } from '@/components/home/HeroSection'
import { TipSection } from '@/components/home/TipSection'
import { AboutSection } from '@/components/home/AboutSection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'

export default function HomePage() {
  usePageTracking()

  return (
    <div className="relative">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-600/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <HeroSection />
        <TipSection />
        <AboutSection />
        <TestimonialsSection />
      </div>
    </div>
  )
}