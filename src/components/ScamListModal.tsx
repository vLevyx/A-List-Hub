'use client'

import { useState, useEffect, ReactElement } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// --- Types ---
interface Scammer {
  id: string
  in_game_name: string
  discord_name?: string | null
  verified: boolean
  description?: string | null
  created_at: string
}

interface ScamListModalProps {
  isOpen: boolean
  onClose: () => void
}

// --- Component ---
export function ScamListModal({
  isOpen,
  onClose,
}: ScamListModalProps): ReactElement | null {
  const [scammers, setScammers] = useState<Scammer[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return

    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('scam_list')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load full scam list:', error)
        setScammers([])
      } else {
        setScammers(data ?? [])
      }

      setLoading(false)
    })()
  }, [isOpen, supabase])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl max-w-2xl w-full p-6 text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-red-400"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-4">All Known Scammers</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : scammers.length === 0 ? (
          <p className="text-center text-white/60 py-4">
            No scammers reported yet
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {scammers.map((scam) => (
              <div
                key={scam.id}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="text-red-400 font-medium">
                      {scam.in_game_name}
                    </p>
                    {scam.discord_name && (
                      <p className="text-red-300/80 text-xs">
                        Discord: {scam.discord_name}
                      </p>
                    )}
                  </div>
                  {scam.verified && (
                    <span className="text-red-400 text-xs">✓ Verified</span>
                  )}
                </div>
                {scam.description && (
                  <p className="text-white/70 text-sm">{scam.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
