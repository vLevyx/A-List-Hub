// src/app/api/cleanup-sessions/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the request body to determine cleanup type
    const body = await request.json().catch(() => ({}))
    const { type = 'orphaned' } = body // 'orphaned', 'old', or 'all'
    
    let result: any = {}
    
    if (type === 'orphaned' || type === 'all') {
      // Clean up orphaned sessions
      const { data: orphanedResult, error: orphanedError } = await supabase
        .rpc('cleanup_orphaned_page_sessions')
      
      if (orphanedError) {
        console.error('Error cleaning up orphaned sessions:', orphanedError)
        return NextResponse.json(
          { error: 'Failed to clean up orphaned sessions', details: orphanedError.message },
          { status: 500 }
        )
      }
      
      result.orphaned_cleanup = orphanedResult
    }
    
    if (type === 'old' || type === 'all') {
      // Clean up old sessions
      const { data: oldResult, error: oldError } = await supabase
        .rpc('cleanup_old_page_sessions')
      
      if (oldError) {
        console.error('Error cleaning up old sessions:', oldError)
        return NextResponse.json(
          { error: 'Failed to clean up old sessions', details: oldError.message },
          { status: 500 }
        )
      }
      
      result.old_sessions_cleanup = oldResult
    }
    
    if (type === 'manual') {
      // Use the manual cleanup function
      const { data: manualResult, error: manualError } = await supabase
        .rpc('manual_session_cleanup')
      
      if (manualError) {
        console.error('Error running manual cleanup:', manualError)
        return NextResponse.json(
          { error: 'Failed to run manual cleanup', details: manualError.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json(manualResult)
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in cleanup-sessions API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET method for health checks or scheduled calls
export async function GET() {
  try {
    const supabase = createClient()
    
    // Run the manual cleanup function
    const { data, error } = await supabase.rpc('manual_session_cleanup')
    
    if (error) {
      console.error('Error in scheduled cleanup:', error)
      return NextResponse.json(
        { error: 'Cleanup failed', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in scheduled cleanup:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
