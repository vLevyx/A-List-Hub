import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const client = createClient(
  'https://dsexkdjxmhgqahrlkvax.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
);

let currentPageSessionId = null;
let currentPage = window.location.pathname.replace(/\.html$/, '');
let discord_id = null;
let username = null;

async function initTracking() {
  const { data: session } = await client.auth.getSession();
  discord_id = session?.session?.user?.user_metadata?.provider_id;
  username = session?.session?.user?.user_metadata?.full_name ||
    session?.session?.user?.user_metadata?.name ||
    session?.session?.user?.user_metadata?.user_name ||
    'Unknown User';

  if (!discord_id) return;

  // ✅ Start initial page session
  await startPageSession();

  // ✅ Set up page change detection
  setupPageChangeDetection();

  // ✅ Set up exit detection
  setupExitDetection();

  // ✅ Keep user online status updated (heartbeat for users table)
  updateOnlineStatus();
  setInterval(() => updateOnlineStatus(), 2 * 60 * 1000); // Every 2 minutes

  // ✅ Mark user as active periodically
  markAsActive();
  setInterval(() => markAsActive(), 30 * 1000); // Every 30 seconds
}

async function startPageSession() {
  try {
    const { data, error } = await client.from('page_sessions').insert([
      {
        discord_id,
        username,
        page_path: currentPage,
        enter_time: new Date().toISOString(),
        is_active: true
      }
    ]).select('id').single();

    if (error) {
      console.error('[Page Session] Start Error:', error.message);
    } else {
      currentPageSessionId = data?.id;
      console.log(`[Page Session] Started session ${currentPageSessionId} for page: ${currentPage}`);
    }
  } catch (err) {
    console.error('[Page Session] Start Error:', err.message);
  }
}

async function endPageSession() {
  if (currentPageSessionId) {
    try {
      await client
        .from('page_sessions')
        .update({
          exit_time: new Date().toISOString(),
          is_active: false
        })
        .eq('id', currentPageSessionId);

      console.log(`[Page Session] Ended session ${currentPageSessionId}`);
      currentPageSessionId = null;
    } catch (err) {
      console.error('[Page Session] End Error:', err.message);
    }
  }
}

async function updateOnlineStatus() {
  if (!discord_id) return;

  try {
    // This maintains your original heartbeat functionality for the users table
    await client
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('discord_id', discord_id);
  } catch (err) {
    console.error('[Heartbeat] Error:', err.message);
  }
}

async function markAsActive() {
  if (currentPageSessionId && document.visibilityState === 'visible') {
    try {
      // Update the current page session to show it's still active
      await client
        .from('page_sessions')
        .update({ is_active: true })
        .eq('id', currentPageSessionId);
    } catch (err) {
      console.error('[Activity] Error:', err.message);
    }
  }
}

function setupPageChangeDetection() {
  // Handle navigation within SPA (if applicable)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function () {
    originalPushState.apply(history, arguments);
    handlePageChange();
  };

  history.replaceState = function () {
    originalReplaceState.apply(history, arguments);
    handlePageChange();
  };

  window.addEventListener('popstate', () => handlePageChange());

  // Handle regular page navigation
  window.addEventListener('beforeunload', () => {
    handlePageChange();
  });
}

async function handlePageChange() {
  const newPage = window.location.pathname.replace(/\.html$/, '');

  if (newPage !== currentPage) {
    console.log(`[Page Change] From ${currentPage} to ${newPage}`);

    await endPageSession();

    currentPage = newPage;
    await startPageSession();
  }
}

function setupExitDetection() {
  // Handle page unload (close tab/navigate away)
  window.addEventListener('beforeunload', async (event) => {
    await endPageSession();
  });

  // Handle visibility change (when tab becomes hidden/visible)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      // Mark as inactive but don't end session (user might come back)
      if (currentPageSessionId) {
        try {
          await client
            .from('page_sessions')
            .update({ is_active: false })
            .eq('id', currentPageSessionId);
        } catch (err) {
          console.error('[Visibility] Error:', err.message);
        }
      }
    } else if (document.visibilityState === 'visible') {
      // Mark as active again
      await markAsActive();
    }
  });

  // Handle explicit logout (if you have a logout button)
  window.handleExplicitLogout = async () => {
    await endPageSession();
  };
}

// Cleanup function to end sessions that have been inactive for too long
async function cleanupInactiveSessions() {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    await client
      .from('page_sessions')
      .update({
        exit_time: new Date().toISOString(),
        is_active: false
      })
      .eq('discord_id', discord_id)
      .is('exit_time', null)
      .lt('enter_time', fifteenMinutesAgo);
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
  }
}

// Run cleanup every 5 minutes
setInterval(() => cleanupInactiveSessions(), 5 * 60 * 1000);

initTracking();