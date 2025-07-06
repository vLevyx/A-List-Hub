// app/api/cleanup-sessions/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the current time minus 10 minutes (sessions older than 10 minutes without activity)
    const cutoffTime = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    // Find and close orphaned sessions
    const { data: orphanedSessions, error: fetchError } = await supabase
      .from('page_sessions')
      .select('id, discord_id, page_path, enter_time')
      .eq('is_active', true)
      .lt('enter_time', cutoffTime)
    
    if (fetchError) {
      console.error('Error fetching orphaned sessions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch orphaned sessions' },
        { status: 500 }
      )
    }
    
    if (orphanedSessions && orphanedSessions.length > 0) {
      // Close the orphaned sessions
      const { error: updateError } = await supabase
        .from('page_sessions')
        .update({
          exit_time: new Date().toISOString(),
          is_active: false
        })
        .in('id', orphanedSessions.map(session => session.id))
      
      if (updateError) {
        console.error('Error closing orphaned sessions:', updateError)
        return NextResponse.json(
          { error: 'Failed to close orphaned sessions' },
          { status: 500 }
        )
      }
      
      console.log(`Closed ${orphanedSessions.length} orphaned sessions`)
    }
    
    return NextResponse.json({
      success: true,
      closedSessions: orphanedSessions?.length || 0
    })
  } catch (error) {
    console.error('Error in cleanup-sessions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Add a cron job endpoint for automated cleanup
export async function GET() {
  // This can be called by a cron job service like Vercel Cron Jobs
  return POST(new NextRequest('http://localhost'))
}
