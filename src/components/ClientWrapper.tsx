'use client'

import { usePageTracking } from '@/hooks/usePageTracking'

export default function ClientWrapper() {
  usePageTracking()
  return null
}