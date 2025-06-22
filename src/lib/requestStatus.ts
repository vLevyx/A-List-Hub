import { createClient } from '@/lib/supabase/client'

export type RequestStatus = 'pending' | 'claimed' | 'completed' | 'cancelled'

export interface UpdateStatusData {
  requestId: string
  newStatus: RequestStatus
  claimedBy?: string
  notes?: string
}

export async function updateRequestStatus(data: UpdateStatusData) {
  try {
    const supabase = createClient()
    
    // Get the current user's session
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session.session) {
      throw new Error('You must be logged in to update request status')
    }

    // Call the status update edge function
    const { data: result, error } = await supabase.functions.invoke('update-request-status', {
      body: data,
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to update status')
    }

    if (!result.success) {
      throw new Error(result.error || 'Status update failed')
    }

    return { success: true, message: result.message }

  } catch (error: any) {
    console.error('Error updating request status:', error)
    
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred while updating status.' 
    }
  }
}

export async function claimRequest(requestId: string) {
  return updateRequestStatus({
    requestId,
    newStatus: 'claimed'
  })
}

export async function completeRequest(requestId: string) {
  return updateRequestStatus({
    requestId,
    newStatus: 'completed'
  })
}

export async function cancelRequest(requestId: string) {
  return updateRequestStatus({
    requestId,
    newStatus: 'cancelled'
  })
}

export async function reopenRequest(requestId: string) {
  return updateRequestStatus({
    requestId,
    newStatus: 'pending'
  })
}