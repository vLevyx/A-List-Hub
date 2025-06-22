// File: src/lib/middleman.ts
import { createClient } from '@/lib/supabase/client'

interface MiddlemanRequestData {
  itemName: string
  price: string
  tradeDetails: string
  tradeRole: 'buyer' | 'seller'
  urgency: 'asap' | 'flexible' | 'specific'
  specificTime?: string
  preferredMiddleman: string
  negotiable: boolean
  discordId: string
  username: string
}

export async function submitMiddlemanRequest(data: MiddlemanRequestData) {
  try {
    const supabase = createClient()
    
    // Get the current user's session
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session.session) {
      throw new Error('You must be logged in to submit a request')
    }

    const requestData = {
      ...data,
      timestamp: new Date().toISOString()
    }

    // Call the Supabase Edge Function (created through dashboard)
    const { data: result, error } = await supabase.functions.invoke('sendMiddlemanRequest', {
      body: requestData,
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    })

    console.log('Function response:', { result, error })

    if (error) {
      console.error('Function invoke error:', error)
      throw new Error(error.message || 'Failed to submit request')
    }

    if (!result || !result.success) {
      console.error('Function returned error:', result)
      throw new Error(result?.error || 'Request failed')
    }

    return { success: true, message: 'Middleman request submitted successfully!' }

  } catch (error: any) {
    console.error('Error submitting middleman request:', error)
    console.error('Full error object:', JSON.stringify(error, null, 2))
    
    // Handle specific error types
    if (error.message?.includes('Rate limited')) {
      return { 
        success: false, 
        error: 'You can only submit one request per hour. Please try again later.',
        minutesRemaining: error.minutesRemaining 
      }
    }
    
    if (error.message?.includes('logged in')) {
      return { 
        success: false, 
        error: 'Please log in to submit a middleman request.' 
      }
    }
    
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred. Please try again.' 
    }
  }
}