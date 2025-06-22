'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AdminScammerFormProps {
  onScammerAdded?: () => void
  userDiscordId: string
}

interface ScammerFormData {
  inGameName: string
  discordName: string
  discordId: string
  description: string
  evidenceUrl: string
  verified: boolean
}

export function AdminScammerForm({ onScammerAdded, userDiscordId }: AdminScammerFormProps) {
  const [formData, setFormData] = useState<ScammerFormData>({
    inGameName: '',
    discordName: '',
    discordId: '',
    description: '',
    evidenceUrl: '',
    verified: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const resetForm = () => {
    setFormData({
      inGameName: '',
      discordName: '',
      discordId: '',
      description: '',
      evidenceUrl: '',
      verified: false
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.inGameName.trim()) {
      setMessage('❌ In-game name is required')
      return
    }

    if (!formData.description.trim()) {
      setMessage('❌ Description of scam is required')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      // Insert into scam_list table
      const { error } = await supabase
        .from('scam_list')
        .insert({
          in_game_name: formData.inGameName.trim(),
          discord_name: formData.discordName.trim() || null,
          discord_id: formData.discordId.trim() || null,
          description: formData.description.trim(),
          evidence_url: formData.evidenceUrl.trim() || null,
          verified: formData.verified,
          added_by: userDiscordId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }

      setMessage('✅ Scammer added successfully to the database')
      resetForm()
      
      // Call callback to refresh any lists
      if (onScammerAdded) {
        onScammerAdded()
      }

      // Auto-clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000)

    } catch (error: any) {
      console.error('Error adding scammer:', error)
      setMessage(`❌ Failed to add scammer: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-red-500/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="text-red-400 mr-2">⚠️</span>
        Add Scammer Report
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* In-Game Name - Required */}
        <div>
          <label htmlFor="inGameName" className="block text-white/90 font-medium mb-1 text-sm">
            In-Game Name* <span className="text-red-400">(Required)</span>
          </label>
          <input
            type="text"
            id="inGameName"
            name="inGameName"
            value={formData.inGameName}
            onChange={handleInputChange}
            placeholder="Player's character name in ELAN Life"
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
            required
          />
        </div>

        {/* Discord Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discordName" className="block text-white/90 font-medium mb-1 text-sm">
              Discord Username
            </label>
            <input
              type="text"
              id="discordName"
              name="discordName"
              value={formData.discordName}
              onChange={handleInputChange}
              placeholder="Username#1234"
              className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
            />
          </div>

          <div>
            <label htmlFor="discordId" className="block text-white/90 font-medium mb-1 text-sm">
              Discord ID
            </label>
            <input
              type="text"
              id="discordId"
              name="discordId"
              value={formData.discordId}
              onChange={handleInputChange}
              placeholder="123456789012345678"
              className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
            />
          </div>
        </div>

        {/* Description - Required */}
        <div>
          <label htmlFor="description" className="block text-white/90 font-medium mb-1 text-sm">
            Description of Scam* <span className="text-red-400">(Required)</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe what they did - stole items, didn't pay, etc..."
            rows={4}
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
            required
          />
        </div>

        {/* Evidence URL */}
        <div>
          <label htmlFor="evidenceUrl" className="block text-white/90 font-medium mb-1 text-sm">
            Evidence URL <span className="text-white/60">(Screenshots, Discord logs, etc.)</span>
          </label>
          <input
            type="url"
            id="evidenceUrl"
            name="evidenceUrl"
            value={formData.evidenceUrl}
            onChange={handleInputChange}
            placeholder="https://imgur.com/screenshot or https://discord.com/channels/..."
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
          />
        </div>

        {/* Verified Checkbox */}
        <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <input
            type="checkbox"
            id="verified"
            name="verified"
            checked={formData.verified}
            onChange={handleInputChange}
            className="w-4 h-4 accent-red-500 mr-3"
          />
          <label htmlFor="verified" className="text-white/90 text-sm">
            <span className="font-medium">Mark as verified scammer</span>
            <span className="block text-white/60 text-xs">Check this if you have solid proof they are a scammer</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Adding to Database...
              </span>
            ) : (
              '⚠️ Add to Scammer List'
            )}
          </Button>

          <Button
            type="button"
            onClick={resetForm}
            disabled={isSubmitting}
            variant="secondary"
            className="px-6"
          >
            Clear Form
          </Button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`text-sm p-3 rounded-lg border ${
            message.includes('✅') 
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message}
          </div>
        )}
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-400 text-sm">
          <span className="font-medium">⚠️ Important:</span> Only add players you have verified evidence against. 
          False reports can harm innocent players and will result in admin action against the reporter.
        </p>
      </div>
    </div>
  )
}