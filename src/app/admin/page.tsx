'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getDiscordId } from '@/lib/utils'

// Custom tabs component to avoid dependency on @radix-ui
const Tabs = ({ children }: { children: React.ReactNode }) => children

const TabsList = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`inline-flex h-12 items-center justify-center rounded-lg bg-white/5 p-1 text-white/70 ${className}`}>
    {children}
  </div>
)

const TabsTrigger = ({ 
  children, 
  value, 
  onClick, 
  active, 
  className = '' 
}: { 
  children: React.ReactNode, 
  value: string, 
  onClick: (value: string) => void, 
  active: boolean, 
  className?: string 
}) => (
  <button
    onClick={() => onClick(value)}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
      active ? 'bg-[#00c6ff] text-black shadow-sm' : 'hover:bg-white/10'
    } ${className}`}
  >
    {children}
  </button>
)

const TabsContent = ({ 
  children, 
  value, 
  activeValue, 
  className = '' 
}: { 
  children: React.ReactNode, 
  value: string, 
  activeValue: string, 
  className?: string 
}) => (
  <div className={`mt-2 ${value === activeValue ? 'block' : 'hidden'} ${className}`}>
    {children}
  </div>
)

// Types
interface User {
  id: string | null
  username: string | null
  created_at: string
  revoked: boolean | null
  discord_id: string
  last_login: string | null
  login_count: number | null
  hub_trial: boolean | null
  trial_expiration: string | null
}

interface AdminLog {
  id: string
  admin_id: string | null
  admin_name: string | null
  action: string | null
  target_discord_id: string | null
  created_at: string | null
  description: string | null
}

interface PageSession {
  id: string
  discord_id: string
  username: string | null
  page_path: string
  enter_time: string | null
  exit_time: string | null
  time_spent_seconds: number | null
  is_active: boolean | null
}

interface PageAnalytics {
  page_path: string
  time_spent_seconds: number
  username: string | null
}

interface UserPageData {
  [username: string]: {
    [page_path: string]: number[]
  }
}

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

// Toast component
const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [onClose])
  
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md border-l-4 ${
      type === 'success' ? 'bg-green-900/80 border-green-500 text-green-100' :
      type === 'error' ? 'bg-red-900/80 border-red-500 text-red-100' :
      'bg-blue-900/80 border-blue-500 text-blue-100'
    } backdrop-blur-md`}>
      <div className="flex items-start">
        <div className="flex-1">
          {message}
        </div>
        <button 
          onClick={onClose}
          className="ml-4 text-white/70 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  usePageTracking()
  const { user, loading } = useAuth()
  const supabase = createClient()
  
  // Tab state
  const [activeTab, setActiveTab] = useState('users')
  
  // User management state
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterActivity, setFilterActivity] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterDateRange, setFilterDateRange] = useState('all')
  const [sortBy, setSortBy] = useState('last_login')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([])
  const [userBlueprints, setUserBlueprints] = useState<string[]>([])
  
  // Analytics state
  const [pageData, setPageData] = useState<PageAnalytics[]>([])
  const [userData, setUserData] = useState<UserPageData>({})
  const [selectedAnalyticsUser, setSelectedAnalyticsUser] = useState('')
  const [minTime, setMinTime] = useState(0)
  const [sortByAnalytics, setSortByAnalytics] = useState('time')
  const [pagesLimit, setPagesLimit] = useState(15)
  const [logsPage, setLogsPage] = useState(0)
  const [logsLimit, setLogsLimit] = useState(15)
  const [filterAdmin, setFilterAdmin] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterDesc, setFilterDesc] = useState('')
  const [filterTarget, setFilterTarget] = useState('')
  
  // Admin IDs
  const adminDiscordIds = [
    "154388953053659137",
    "344637470908088322",
    "796587763851198474",
    "492053410967846933",
    "487476487386038292"
  ]
  
  // Check if user is admin
  const isAdmin = useCallback(() => {
    if (!user) return false
    const discordId = getDiscordId(user)
    return discordId ? adminDiscordIds.includes(discordId) : false
  }, [user, adminDiscordIds])
  
  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || !isAdmin())) {
      window.location.href = '/'
    }
  }, [loading, user, isAdmin])
  
  // Initialize data
  useEffect(() => {
    if (!loading && user && isAdmin()) {
      loadUsers()
      loadAuditLogs()
      loadPageSessions()
      setupRealtimeSubscriptions()
    }
    
    return () => {
      // Clean up subscriptions
      const subscription = supabase.channel('admin-changes')
      supabase.removeChannel(subscription)
    }
  }, [loading, user, isAdmin])
  
  // Set up realtime subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    const channel = supabase.channel('admin-changes')
    
    // Users table changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        console.log('Users table changed:', payload)
        loadUsers()
      }
    )
    
    // Admin logs changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'admin_logs' },
      (payload) => {
        console.log('Admin logs changed:', payload)
        loadAuditLogs()
      }
    )
    
    // Page sessions changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'page_sessions' },
      (payload) => {
        console.log('Page sessions changed:', payload)
        loadPageSessions()
      }
    )
    
    channel.subscribe()
  }, [supabase])
  
  // Load users
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setUsers(data || [])
      applyFiltersAndSort(data || [])
      trackUserSessions(data || [])
      
    } catch (error) {
      console.error('Error loading users:', error)
      showToast('Failed to load users', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])
  
  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(logsPage * logsLimit, (logsPage + 1) * logsLimit - 1)
      
      if (error) throw error
      
      setAuditLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    }
  }, [supabase, logsPage, logsLimit])
  
  // Load page sessions
  const loadPageSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('page_sessions')
        .select('page_path, time_spent_seconds, username')
        .not('time_spent_seconds', 'is', null)
      
      if (error) throw error
      
      // Process data for analytics
      const sessions = data || []
      setPageData(sessions)
      
      // Process user data
      const userSessions: UserPageData = {}
      
      sessions.forEach(session => {
        if (session.username) {
          if (!userSessions[session.username]) {
            userSessions[session.username] = {}
          }
          
          if (!userSessions[session.username][session.page_path]) {
            userSessions[session.username][session.page_path] = []
          }
          
          if (session.time_spent_seconds) {
            userSessions[session.username][session.page_path].push(session.time_spent_seconds)
          }
        }
      })
      
      setUserData(userSessions)
      
    } catch (error) {
      console.error('Error loading page sessions:', error)
    }
  }, [supabase])
  
  // Track user sessions
  const trackUserSessions = useCallback(async (users: User[]) => {
    try {
      // Get users who logged in within the last 5 minutes
      const recentUsers = users.filter(user => {
        if (!user.last_login) return false
        const lastLogin = new Date(user.last_login)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        return lastLogin > fiveMinutesAgo
      })
      
      const onlineIds = new Set(recentUsers.map(user => user.discord_id))
      setOnlineUsers(onlineIds)
      
    } catch (error) {
      console.error('Error tracking user sessions:', error)
    }
  }, [])
  
  // Load user blueprints
  const loadUserBlueprints = useCallback(async (discordId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_blueprints')
        .select('blueprint_name')
        .eq('discord_id', discordId)
      
      if (error) throw error
      
      setUserBlueprints(data?.map(bp => bp.blueprint_name) || [])
    } catch (error) {
      console.error('Error loading blueprints:', error)
      setUserBlueprints([])
    }
  }, [supabase])
  
  // Apply filters and sort
  const applyFiltersAndSort = useCallback((usersToFilter = users) => {
    let filtered = [...usersToFilter]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user => 
        user.discord_id.toLowerCase().includes(term) || 
        (user.username && user.username.toLowerCase().includes(term))
      )
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'whitelisted':
          filtered = filtered.filter(user => !user.revoked)
          break
        case 'revoked':
          filtered = filtered.filter(user => user.revoked)
          break
        case 'trial':
          filtered = filtered.filter(user => 
            user.hub_trial && 
            user.trial_expiration && 
            new Date(user.trial_expiration) > new Date()
          )
          break
      }
    }
    
    // Apply activity filter
    if (filterActivity !== 'all') {
      const now = new Date()
      switch (filterActivity) {
        case 'active_24h':
          filtered = filtered.filter(user => 
            user.last_login && 
            new Date(user.last_login) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
          )
          break
        case 'active_7d':
          filtered = filtered.filter(user => 
            user.last_login && 
            new Date(user.last_login) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          )
          break
        case 'active_30d':
          filtered = filtered.filter(user => 
            user.last_login && 
            new Date(user.last_login) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          )
          break
        case 'never_logged':
          filtered = filtered.filter(user => !user.last_login)
          break
      }
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      switch (filterType) {
        case 'admin':
          filtered = filtered.filter(user => adminDiscordIds.includes(user.discord_id))
          break
        case 'regular':
          filtered = filtered.filter(user => 
            !adminDiscordIds.includes(user.discord_id) && !user.hub_trial
          )
          break
        case 'trial':
          filtered = filtered.filter(user => user.hub_trial)
          break
      }
    }
    
    // Apply date range filter
    if (filterDateRange !== 'all') {
      const now = new Date()
      let startDate: Date
      
      switch (filterDateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }
      
      filtered = filtered.filter(user => 
        user.created_at && new Date(user.created_at) >= startDate
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'username':
          return (a.username || '').localeCompare(b.username || '')
        case 'login_count':
          return (b.login_count || 0) - (a.login_count || 0)
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'trial_expiration':
          const aExp = a.trial_expiration ? new Date(a.trial_expiration).getTime() : 0
          const bExp = b.trial_expiration ? new Date(b.trial_expiration).getTime() : 0
          return bExp - aExp
        default: // last_login
          const aLogin = a.last_login ? new Date(a.last_login).getTime() : 0
          const bLogin = b.last_login ? new Date(b.last_login).getTime() : 0
          return bLogin - aLogin
      }
    })
    
    setFilteredUsers(filtered)
  }, [users, searchTerm, filterStatus, filterActivity, filterType, filterDateRange, sortBy, adminDiscordIds])
  
  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
  }, [])
  
  // Log audit event
  const logAuditEvent = useCallback(async (action: string, description: string, userId?: string) => {
    if (!user) return
    
    try {
      const adminId = getDiscordId(user)
      const adminName = user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown'
      
      const { error } = await supabase.from('admin_logs').insert([{
        action,
        description,
        admin_id: adminId,
        admin_name: adminName,
        target_discord_id: userId,
        created_at: new Date().toISOString()
      }])
      
      if (error) throw error
      
    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }, [user, supabase])
  
  // User management functions
  const addUser = useCallback(async (discordId: string, username: string) => {
    if (!discordId) {
      showToast('Discord ID is required', 'error')
      return
    }
    
    if (users.some(u => u.discord_id === discordId)) {
      showToast('User already exists', 'info')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          discord_id: discordId,
          username: username || null,
          revoked: false,
          created_at: new Date().toISOString()
        }])
        .select()
      
      if (error) throw error
      
      showToast('User whitelisted successfully', 'success')
      logAuditEvent('whitelist', `User ${username || discordId} whitelisted`, discordId)
      
    } catch (error) {
      console.error('Error adding user:', error)
      showToast('Failed to whitelist user', 'error')
    }
  }, [users, supabase, showToast, logAuditEvent])
  
  // Update user status
  const updateUserStatus = useCallback(async (discordId: string, revoked: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ revoked })
        .eq('discord_id', discordId)
      
      if (error) throw error
      
      const action = revoked ? 'revoke' : 'whitelist'
      const actionText = revoked ? 'revoked' : 'whitelisted'
      
      showToast(`User ${actionText} successfully`, 'success')
      logAuditEvent(action, `${revoked ? 'Revoke' : 'Whitelist'} action performed`, discordId)
      
      // Update selected user if panel is open
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(prev => prev ? { ...prev, revoked } : null)
      }
      
    } catch (error) {
      console.error('Error updating user status:', error)
      showToast('Failed to update user status', 'error')
    }
  }, [supabase, showToast, logAuditEvent, selectedUser])
  
  // Update trial time
  const updateTrialTime = useCallback(async (discordId: string, days: number) => {
    const trialExpiration = new Date()
    trialExpiration.setDate(trialExpiration.getDate() + days)
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          hub_trial: true,
          trial_expiration: trialExpiration.toISOString()
        })
        .eq('discord_id', discordId)
      
      if (error) throw error
      
      showToast(`Trial extended by ${days} days`, 'success')
      logAuditEvent('trial', `${days} Day Trial action performed`, discordId)
      
      // Update selected user if panel is open
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(prev => prev ? { 
          ...prev, 
          hub_trial: true,
          trial_expiration: trialExpiration.toISOString()
        } : null)
      }
      
    } catch (error) {
      console.error('Error updating trial:', error)
      showToast('Failed to update trial', 'error')
    }
  }, [supabase, showToast, logAuditEvent, selectedUser])
  
  // Convert trial to permanent
  const convertTrialToPermanent = useCallback(async (discordId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          revoked: false,
          trial_expiration: null
        })
        .eq('discord_id', discordId)
      
      if (error) throw error
      
      showToast('User converted to permanent whitelist', 'success')
      logAuditEvent('whitelist', 'Trial converted to permanent whitelist', discordId)
      
      // Update selected user if panel is open
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(prev => prev ? { 
          ...prev, 
          revoked: false,
          trial_expiration: null
        } : null)
      }
      
    } catch (error) {
      console.error('Error converting trial:', error)
      showToast('Failed to convert trial to permanent', 'error')
    }
  }, [supabase, showToast, logAuditEvent, selectedUser])
  
  // Delete user
  const deleteUser = useCallback(async (discordId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('discord_id', discordId)
      
      if (error) throw error
      
      showToast('User deleted successfully', 'success')
      logAuditEvent('delete', `User deleted`, discordId)
      
      // Close side panel if open
      if (selectedUser?.discord_id === discordId) {
        setSidePanelOpen(false)
        setSelectedUser(null)
      }
      
      // Remove from selected users
      setSelectedUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(discordId)
        return newSet
      })
      
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('Failed to delete user', 'error')
    }
  }, [supabase, showToast, logAuditEvent, selectedUser])
  
  // Bulk operations
  const bulkWhitelist = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
      return
    }
    
    if (!confirm(`Whitelist ${selectedUsers.size} selected users?`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ revoked: false })
        .in('discord_id', Array.from(selectedUsers))
      
      if (error) throw error
      
      showToast(`${selectedUsers.size} users whitelisted`, 'success')
      logAuditEvent('bulk_whitelist', `Bulk Whitelist action performed for ${selectedUsers.size} users`)
      
      // Clear selection
      setSelectedUsers(new Set())
      
    } catch (error) {
      console.error('Bulk whitelist error:', error)
      showToast('Failed to whitelist users', 'error')
    }
  }, [selectedUsers, supabase, showToast, logAuditEvent])
  
  const bulkRevoke = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
      return
    }
    
    if (!confirm(`Revoke access for ${selectedUsers.size} selected users?`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ revoked: true })
        .in('discord_id', Array.from(selectedUsers))
      
      if (error) throw error
      
      showToast(`${selectedUsers.size} users revoked`, 'success')
      logAuditEvent('bulk_revoke', `Bulk Revoke action performed for ${selectedUsers.size} users`)
      
      // Clear selection
      setSelectedUsers(new Set())
      
    } catch (error) {
      console.error('Bulk revoke error:', error)
      showToast('Failed to revoke users', 'error')
    }
  }, [selectedUsers, supabase, showToast, logAuditEvent])
  
  const bulkAddTrial = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
      return
    }
    
    if (!confirm(`Add 7-day trial to ${selectedUsers.size} selected users?`)) {
      return
    }
    
    const trialExpiration = new Date()
    trialExpiration.setDate(trialExpiration.getDate() + 7)
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          hub_trial: true,
          trial_expiration: trialExpiration.toISOString()
        })
        .in('discord_id', Array.from(selectedUsers))
      
      if (error) throw error
      
      showToast(`7-day trial added for ${selectedUsers.size} users`, 'success')
      logAuditEvent('trial', `Bulk trial assignment for ${selectedUsers.size} users`)
      
      // Clear selection
      setSelectedUsers(new Set())
      
    } catch (error) {
      console.error('Bulk trial error:', error)
      showToast('Failed to add trials', 'error')
    }
  }, [selectedUsers, supabase, showToast, logAuditEvent])
  
  const bulkDelete = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
      return
    }
    
    if (!confirm(`DELETE ${selectedUsers.size} selected users? This action cannot be undone!`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .in('discord_id', Array.from(selectedUsers))
      
      if (error) throw error
      
      showToast(`${selectedUsers.size} users deleted`, 'success')
      logAuditEvent('bulk_delete', `Bulk Delete action performed for ${selectedUsers.size} users`)
      
      // Clear selection
      setSelectedUsers(new Set())
      
    } catch (error) {
      console.error('Bulk delete error:', error)
      showToast('Failed to delete users', 'error')
    }
  }, [selectedUsers, supabase, showToast, logAuditEvent])
  
  // Selection management
  const toggleUserSelection = useCallback((discordId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(discordId)) {
        newSet.delete(discordId)
      } else {
        newSet.add(discordId)
      }
      return newSet
    })
  }, [])
  
  const toggleSelectAll = useCallback(() => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.discord_id)))
    }
  }, [selectedUsers, filteredUsers])
  
  // Side panel management
  const openUserPanel = useCallback(async (discordId: string) => {
    const user = users.find(u => u.discord_id === discordId)
    if (!user) return
    
    setSelectedUser(user)
    setSidePanelOpen(true)
    
    // Load user blueprints
    await loadUserBlueprints(discordId)
    
  }, [users, loadUserBlueprints])
  
  // Format date
  const formatDate = useCallback((dateString?: string | null) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])
  
  // Format relative time
  const formatRelativeTime = useCallback((dateString?: string | null) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return formatDate(dateString)
  }, [formatDate])
  
  // Get trial status
  const getTrialStatus = useCallback((user: User) => {
    if (!user.hub_trial) return 'N/A'
    
    if (!user.trial_expiration) {
      return 'TRIAL'
    }
    
    const expiration = new Date(user.trial_expiration)
    const now = new Date()
    
    if (expiration > now) {
      const daysLeft = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return `TRIAL (${daysLeft}d)`
    } else {
      return 'EXPIRED'
    }
  }, [])
  
  // Get status badge class - FIXED: Updated for audit logs to match action types
  const getStatusBadgeClass = useCallback((status: string) => {
    const statusLower = status.toLowerCase()
    
    // Handle audit log action types
    if (statusLower.includes('whitelist') || statusLower.includes('access')) {
      return 'bg-green-500/20 text-green-400 border border-green-500/30'
    }
    if (statusLower.includes('revoke') || statusLower.includes('revoked')) {
      return 'bg-red-500/20 text-red-400 border border-red-500/30'
    }
    if (statusLower.includes('trial')) {
      return 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
    }
    if (statusLower.includes('delete')) {
      return 'bg-red-600/20 text-red-300 border border-red-600/30'
    }
    
    // Handle other status types
    switch (statusLower) {
      case 'whitelisted':
        return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'revoked':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'online':
        return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'offline':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/20'
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/20'
    }
  }, [])
  
  // Analytics functions
  const updateStatistics = useCallback((data: PageAnalytics[], users: UserPageData) => {
    // Stats are calculated in the component render
  }, [])
  
  const renderTopPages = useCallback((data: PageAnalytics[]) => {
    // Group by page path and sum time spent
    const totals: Record<string, { time: number, sessions: number }> = {}
    
    data.forEach(row => {
      if (!totals[row.page_path]) {
        totals[row.page_path] = { time: 0, sessions: 0 }
      }
      totals[row.page_path].time += row.time_spent_seconds
      totals[row.page_path].sessions++
    })
    
    // Sort by time spent
    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b.time - a.time)
      .slice(0, pagesLimit)
    
    return sorted
  }, [pagesLimit])
  
  const renderUserTable = useCallback((username: string) => {
    if (!username || !userData[username]) return null
    
    // Calculate user statistics
    const userPages = userData[username]
    const entries = Object.entries(userPages)
    
    // Filter and sort data
    const filteredEntries = entries
      .map(([page, sessions]) => ({
        page,
        sessions: sessions.length,
        totalTime: sessions.reduce((sum, time) => sum + time, 0),
        avgTime: sessions.reduce((sum, time) => sum + time, 0) / sessions.length
      }))
      .filter(entry => (entry.totalTime / 60) >= minTime)
    
    // Sort data
    filteredEntries.sort((a, b) => {
      switch (sortByAnalytics) {
        case 'sessions': return b.sessions - a.sessions
        case 'page': return a.page.localeCompare(b.page)
        case 'time':
        default: return b.totalTime - a.totalTime
      }
    })
    
    return filteredEntries
  }, [userData, minTime, sortByAnalytics])
  
  // Filter audit logs
  const getFilteredAuditLogs = useCallback(() => {
    return auditLogs.filter(log => 
      (!filterAdmin || (log.admin_name?.toLowerCase() || '').includes(filterAdmin.toLowerCase())) &&
      (!filterAction || (log.action?.toLowerCase() || '').includes(filterAction.toLowerCase())) &&
      (!filterDesc || (log.description?.toLowerCase() || '').includes(filterDesc.toLowerCase())) &&
      (!filterTarget || (log.target_discord_id?.toLowerCase() || '').includes(filterTarget.toLowerCase()))
    )
  }, [auditLogs, filterAdmin, filterAction, filterDesc, filterTarget])
  
  // Update filters and sort
  useEffect(() => {
    applyFiltersAndSort()
  }, [searchTerm, filterStatus, filterActivity, filterType, filterDateRange, sortBy])
  
  // Update audit logs when filters change
  useEffect(() => {
    loadAuditLogs()
  }, [logsPage, logsLimit, loadAuditLogs])
  
  // Calculate statistics
  const stats = {
    totalUsers: users.length,
    whitelistedUsers: users.filter(u => !u.revoked).length,
    revokedUsers: users.filter(u => u.revoked).length,
    trialUsers: users.filter(u => 
      u.hub_trial && u.trial_expiration && new Date(u.trial_expiration) > new Date()
    ).length,
    onlineUsers: onlineUsers.size,
    totalLogins: users.reduce((sum, u) => sum + (u.login_count || 0), 0),
    activeUsers: users.filter(u => {
      if (!u.last_login) return false
      const lastLogin = new Date(u.last_login)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return lastLogin > oneDayAgo
    }).length
  }
  
  // Analytics statistics
  const analyticsStats = {
    totalUsers: Object.keys(userData).length,
    totalSessions: pageData.length,
    avgSessionTime: pageData.length > 0 
      ? pageData.reduce((sum, row) => sum + row.time_spent_seconds, 0) / pageData.length 
      : 0,
    uniquePages: new Set(pageData.map(row => row.page_path)).size
  }
  
  // User analytics statistics
  const getUserAnalyticsStats = (username: string) => {
    if (!username || !userData[username]) return { totalTime: 0, totalSessions: 0, uniquePages: 0 }
    
    const userPages = userData[username]
    const entries = Object.entries(userPages)
    const totalSessions = entries.reduce((sum, [, sessions]) => sum + sessions.length, 0)
    const totalTime = entries.reduce((sum, [, sessions]) => sum + sessions.reduce((s, t) => s + t, 0), 0)
    const uniquePages = entries.length
    
    return { totalTime, totalSessions, uniquePages }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    )
  }
  
  if (!user || !isAdmin()) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-[#121212] text-[#f0f0f0] p-4 md:p-8">
      {/* FIXED: Made container wider on desktop by changing from max-w-7xl to max-w-[1600px] */}
      <div className="max-w-[1600px] mx-auto bg-[rgba(30,30,30,0.9)] rounded-xl p-4 md:p-8 border border-white/5 shadow-2xl backdrop-blur-xl relative">
        <Link href="/" className="inline-flex items-center text-[#00c6ff] border border-[#00c6ff] rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#00c6ff]/10 transition-colors mb-4">
          ← Back
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold text-[#00c6ff] text-center mb-6">Admin Dashboard</h1>
        
        {/* Tabs */}
        <div className="mb-8 flex justify-center">
          <TabsList>
            <TabsTrigger 
              value="users" 
              onClick={setActiveTab} 
              active={activeTab === 'users'}
            >
              User Management
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              onClick={setActiveTab} 
              active={activeTab === 'analytics'}
            >
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* User Management Tab */}
        <TabsContent value="users" activeValue={activeTab}>
          <div className="space-y-6">
            {/* Add User Form */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input 
                type="text" 
                id="newDiscordId" 
                placeholder="Enter Discord ID"
                className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white"
              />
              <input 
                type="text" 
                id="newUsername" 
                placeholder="Enter Username"
                className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white"
              />
              <button 
                onClick={() => {
                  const discordId = (document.getElementById('newDiscordId') as HTMLInputElement).value
                  const username = (document.getElementById('newUsername') as HTMLInputElement).value
                  addUser(discordId, username)
                }}
                className="bg-[#00c6ff] text-black font-bold py-3 px-6 rounded-lg hover:bg-[#00a9db] transition-colors"
              >
                Whitelist User
              </button>
            </div>
            
            {/* FIXED: Removed Analytics Dashboard button */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-[#00c6ff] border border-[#00c6ff] px-4 py-2 rounded-lg hover:bg-[#00c6ff]/10 transition-colors"
              >
                {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
              </button>
            </div>
            
            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="bg-white/2 border border-white/5 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-white/70">Status</label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="p-2 bg-[#2a2a2a] text-white border border-white/20 rounded-lg"
                    >
                      <option value="all">All Users</option>
                      <option value="whitelisted">Whitelisted</option>
                      <option value="revoked">Revoked</option>
                      <option value="trial">On Trial</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-white/70">Login Activity</label>
                    <select 
                      value={filterActivity}
                      onChange={(e) => setFilterActivity(e.target.value)}
                      className="p-2 bg-[#2a2a2a] text-white border border-white/20 rounded-lg"
                    >
                      <option value="all">All Activity</option>
                      <option value="active_24h">Active 24h</option>
                      <option value="active_7d">Active 7d</option>
                      <option value="active_30d">Active 30d</option>
                      <option value="never_logged">Never Logged In</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-white/70">Account Type</label>
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="p-2 bg-[#2a2a2a] text-white border border-white/20 rounded-lg"
                    >
                      <option value="all">All Types</option>
                      <option value="admin">Admins</option>
                      <option value="regular">Regular Users</option>
                      <option value="trial">Trial Users</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-white/70">Date Range</label>
                    <select 
                      value={filterDateRange}
                      onChange={(e) => setFilterDateRange(e.target.value)}
                      className="p-2 bg-[#2a2a2a] text-white border border-white/20 rounded-lg"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="quarter">This Quarter</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Search and Sort */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Discord ID, Username, or Email"
                className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white"
              />
              
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-3 bg-[#2a2a2a] text-white border border-white/20 rounded-lg"
              >
                <option value="last_login">Sort: Last Login</option>
                <option value="login_count">Sort: Login Count</option>
                <option value="username">Sort: Username</option>
                <option value="created_at">Sort: Date Added</option>
                <option value="trial_expiration">Sort: Trial Expiration</option>
              </select>
              
              {/* FIXED: Refresh button loading state */}
              <button 
                onClick={loadUsers}
                disabled={isLoading}
                className="bg-[#2a2a2a] text-white border border-white/20 px-6 py-3 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white/90 rounded-full animate-spin mr-2"></span>
                    Loading...
                  </span>
                ) : 'Refresh'}
              </button>
            </div>
            
            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="bg-white/2 border border-white/5 rounded-xl p-4 mb-6">
                <h3 className="text-[#00c6ff] text-lg font-semibold mb-4">
                  Bulk Actions ({selectedUsers.size} selected)
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={bulkWhitelist}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Whitelist Selected
                  </button>
                  <button 
                    onClick={bulkRevoke}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Revoke Selected
                  </button>
                  <button 
                    onClick={bulkAddTrial}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Add 7 Day Trial
                  </button>
                  <button 
                    onClick={bulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <div className="bg-white/4 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl text-[#00c6ff]">👥</div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#00c6ff] mb-1">Total Users</h3>
                  <p className="text-xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
              
              <div className="bg-white/4 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl text-[#00c6ff]">⚡</div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#00c6ff] mb-1">Online Now</h3>
                  <p className="text-xl font-bold">{stats.onlineUsers}</p>
                </div>
              </div>
              
              <div className="bg-white/4 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl text-[#00c6ff]">📈</div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#00c6ff] mb-1">Total Logins</h3>
                  <p className="text-xl font-bold">{stats.totalLogins}</p>
                </div>
              </div>
              
              <div className="bg-white/4 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl text-[#00c6ff]">🔒</div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#00c6ff] mb-1">Revoked Users</h3>
                  <p className="text-xl font-bold">{stats.revokedUsers}</p>
                </div>
              </div>
              
              <div className="bg-white/4 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl text-[#00c6ff]">🎯</div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#00c6ff] mb-1">Trial Users</h3>
                  <p className="text-xl font-bold">{stats.trialUsers}</p>
                </div>
              </div>
              
              <div className="bg-white/4 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl text-[#00c6ff]">⏰</div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#00c6ff] mb-1">Active Last 24h</h3>
                  <p className="text-xl font-bold">{stats.activeUsers}</p>
                </div>
              </div>
            </div>
            
            {/* Users Table */}
            <div className="bg-white/1 border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/3 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded bg-white/10 border-white/30 text-[#00c6ff] focus:ring-[#00c6ff]/30"
                        />
                      </th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Discord ID</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Username</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Added</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Last Login</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Login Count</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Status</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Trial</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Session</th>
                      <th className="p-4 text-left text-[#00c6ff] font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr 
                        key={user.discord_id}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => openUserPanel(user.discord_id)}
                      >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedUsers.has(user.discord_id)}
                            onChange={() => toggleUserSelection(user.discord_id)}
                            className="w-4 h-4 rounded bg-white/10 border-white/30 text-[#00c6ff] focus:ring-[#00c6ff]/30"
                          />
                        </td>
                        <td className="p-4">
                          {user.discord_id}
                          {adminDiscordIds.includes(user.discord_id) && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-black rounded-md">
                              ADMIN
                            </span>
                          )}
                        </td>
                        <td className="p-4">{user.username || 'N/A'}</td>
                        <td className="p-4">{formatDate(user.created_at)}</td>
                        <td className="p-4">{user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                        <td className="p-4">{user.login_count || 0}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                            user.revoked 
                              ? getStatusBadgeClass('revoked') 
                              : getStatusBadgeClass('whitelisted')
                          }`}>
                            {user.revoked ? 'REVOKED' : 'ACCESS'}
                          </span>
                        </td>
                        {/* FIXED: Trial badge with no-wrap to prevent stacking */}
                        <td className="p-4">
                          {user.hub_trial ? (
                            user.trial_expiration && new Date(user.trial_expiration) > new Date() ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase whitespace-nowrap ${getStatusBadgeClass('trial')}`}>
                                {getTrialStatus(user)}
                              </span>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClass('revoked')}`}>
                                EXPIRED
                              </span>
                            )
                          ) : 'N/A'}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                            onlineUsers.has(user.discord_id)
                              ? getStatusBadgeClass('online')
                              : getStatusBadgeClass('offline')
                          }`}>
                            {onlineUsers.has(user.discord_id) ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <button 
                              className="text-white hover:bg-white/10 rounded-md p-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                const dropdown = e.currentTarget.nextElementSibling
                                if (dropdown) {
                                  dropdown.classList.toggle('hidden')
                                }
                              }}
                            >
                              ☰
                            </button>
                            <div className="hidden absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[#2a2a2a] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                <button
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateUserStatus(user.discord_id, !user.revoked)
                                    e.currentTarget.closest('.hidden')?.classList.add('hidden')
                                  }}
                                >
                                  {user.revoked ? 'Whitelist' : 'Revoke'}
                                </button>
                                <button
                                  className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteUser(user.discord_id)
                                    e.currentTarget.closest('.hidden')?.classList.add('hidden')
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-white/50">
                          No users found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" activeValue={activeTab}>
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">{analyticsStats.totalUsers}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Active Users</div>
              </div>
              
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">{analyticsStats.totalSessions}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Total Sessions</div>
              </div>
              
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">
                  {(analyticsStats.avgSessionTime / 60).toFixed(1)}m
                </div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Avg Session Time</div>
              </div>
              
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">{analyticsStats.uniquePages}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Unique Pages</div>
              </div>
            </div>
            
            {/* Top Pages and User Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pages */}
              <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl overflow-hidden">
                <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-4">
                  <h2 className="text-xl font-semibold text-[#00c6ff]">Top Pages by Time Spent</h2>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <select
                      value={pagesLimit}
                      onChange={(e) => setPagesLimit(Number(e.target.value))}
                      className="bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                    >
                      <option value={10}>Top 10</option>
                      <option value={15}>Top 15</option>
                      <option value={25}>Top 25</option>
                    </select>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/10">
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Rank</th>
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Page</th>
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Total Time</th>
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderTopPages(pageData).map(([page, data], index) => (
                          <tr key={page} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="p-3 font-semibold">#{index + 1}</td>
                            <td className="p-3">
                              <span className="bg-white/5 px-2 py-1 rounded text-sm font-mono">
                                {page}
                              </span>
                            </td>
                            <td className="p-3 font-semibold">{(data.time / 60).toFixed(1)} min</td>
                            <td className="p-3">{data.sessions} sessions</td>
                          </tr>
                        ))}
                        
                        {renderTopPages(pageData).length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-white/50">
                              No page data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* User Page Analytics */}
              <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl overflow-hidden">
                <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-4">
                  <h2 className="text-xl font-semibold text-[#00c6ff]">User Page Analytics</h2>
                </div>
                
                <div className="p-4">
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <select
                      value={selectedAnalyticsUser}
                      onChange={(e) => setSelectedAnalyticsUser(e.target.value)}
                      className="flex-1 bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                    >
                      <option value="">Select a user...</option>
                      {Object.keys(userData).sort().map(username => (
                        <option key={username} value={username}>{username}</option>
                      ))}
                    </select>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-white/70">Min time:</label>
                      <input
                        type="number"
                        value={minTime}
                        onChange={(e) => setMinTime(Number(e.target.value))}
                        min={0}
                        className="w-20 bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                      />
                      <span className="text-white/70">minutes</span>
                    </div>
                    
                    <select
                      value={sortByAnalytics}
                      onChange={(e) => setSortByAnalytics(e.target.value)}
                      className="bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                    >
                      <option value="time">Sort by Time</option>
                      <option value="sessions">Sort by Sessions</option>
                      <option value="page">Sort by Page</option>
                    </select>
                  </div>
                  
                  {selectedAnalyticsUser && (
                    <div className="mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-[#00c6ff] mb-1">
                            {(getUserAnalyticsStats(selectedAnalyticsUser).totalTime / 60).toFixed(1)}m
                          </div>
                          <div className="text-xs text-white/70">Total Time</div>
                        </div>
                        
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-[#00c6ff] mb-1">
                            {getUserAnalyticsStats(selectedAnalyticsUser).totalSessions}
                          </div>
                          <div className="text-xs text-white/70">Total Sessions</div>
                        </div>
                        
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-[#00c6ff] mb-1">
                            {getUserAnalyticsStats(selectedAnalyticsUser).uniquePages}
                          </div>
                          <div className="text-xs text-white/70">Unique Pages</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/10">
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Page</th>
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Sessions</th>
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Total Time</th>
                          <th className="p-3 text-left text-[#00c6ff] font-semibold">Avg Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAnalyticsUser && renderUserTable(selectedAnalyticsUser)?.map(entry => (
                          <tr key={entry.page} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="p-3">
                              <span className="bg-white/5 px-2 py-1 rounded text-sm font-mono">
                                {entry.page}
                              </span>
                            </td>
                            <td className="p-3">{entry.sessions}</td>
                            <td className="p-3 font-semibold">{(entry.totalTime / 60).toFixed(1)} min</td>
                            <td className="p-3">{(entry.avgTime / 60).toFixed(1)} min</td>
                          </tr>
                        ))}
                        
                        {!selectedAnalyticsUser && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-white/50">
                              Select a user to view their page analytics
                            </td>
                          </tr>
                        )}
                        
                        {selectedAnalyticsUser && renderUserTable(selectedAnalyticsUser)?.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-white/50">
                              No data matches the current filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Admin Audit Logs */}
            <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl overflow-hidden">
              <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-4">
                <h2 className="text-xl font-semibold text-[#00c6ff]">Admin Audit Logs</h2>
              </div>
              
              <div className="p-4">
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    value={filterAdmin}
                    onChange={(e) => setFilterAdmin(e.target.value)}
                    placeholder="Admin name"
                    className="flex-1 min-w-[200px] bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                  />
                  
                  <input
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    placeholder="Action"
                    className="flex-1 min-w-[200px] bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                  />
                  
                  <input
                    value={filterDesc}
                    onChange={(e) => setFilterDesc(e.target.value)}
                    placeholder="Description"
                    className="flex-1 min-w-[200px] bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                  />
                  
                  <input
                    value={filterTarget}
                    onChange={(e) => setFilterTarget(e.target.value)}
                    placeholder="Target Username"
                    className="flex-1 min-w-[200px] bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                  />
                  
                  <select
                    value={logsLimit}
                    onChange={(e) => setLogsLimit(Number(e.target.value))}
                    className="bg-[#1c1c1c] border border-white/20 text-white p-2 rounded-lg"
                  >
                    <option value={15}>15 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/[0.03] border-b border-white/10">
                        <th className="p-3 text-left text-[#00c6ff] font-semibold">Admin</th>
                        <th className="p-3 text-left text-[#00c6ff] font-semibold">Action</th>
                        <th className="p-3 text-left text-[#00c6ff] font-semibold">Description</th>
                        <th className="p-3 text-left text-[#00c6ff] font-semibold">Target</th>
                        <th className="p-3 text-left text-[#00c6ff] font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAuditLogs().map(log => {
                        const targetUser = users.find(u => u.discord_id === log.target_discord_id)
                        
                        return (
                          <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="p-3 font-semibold">{log.admin_name}</td>
                            <td className="p-3">
                              {/* FIXED: Action badges now use proper color mapping */}
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClass(log.action || '')}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3">{log.description}</td>
                            <td className="p-3">{targetUser?.username || log.target_discord_id || 'N/A'}</td>
                            <td className="p-3">{log.created_at ? formatDate(log.created_at) : 'N/A'}</td>
                          </tr>
                        )
                      })}
                      
                      {getFilteredAuditLogs().length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-white/50">
                            No logs match the current filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-center items-center gap-4 mt-4">
                  <button
                    onClick={() => setLogsPage(prev => Math.max(0, prev - 1))}
                    disabled={logsPage === 0}
                    className="px-4 py-2 bg-[#1c1c1c] border border-white/20 text-white rounded-lg disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  
                  <span className="text-white/70">Page {logsPage + 1}</span>
                  
                  <button
                    onClick={() => setLogsPage(prev => prev + 1)}
                    disabled={getFilteredAuditLogs().length < logsLimit}
                    className="px-4 py-2 bg-[#1c1c1c] border border-white/20 text-white rounded-lg disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </div>
      
      {/* Side Panel */}
      {sidePanelOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidePanelOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-md bg-[#141414] border-l border-white/10 overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#00c6ff]">User Details</h2>
              <button 
                onClick={() => setSidePanelOpen(false)}
                className="text-white/70 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-semibold text-[#00c6ff] mb-2">User Information</h3>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Discord ID:</span>
                  <span className="font-semibold">{selectedUser.discord_id}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Username:</span>
                  <span className="font-semibold">{selectedUser.username || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                    selectedUser.revoked 
                      ? getStatusBadgeClass('revoked') 
                      : getStatusBadgeClass('whitelisted')
                  }`}>
                    {selectedUser.revoked ? 'REVOKED' : 'ACCESS'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Account Type:</span>
                  <span className="font-semibold">
                    {adminDiscordIds.includes(selectedUser.discord_id) ? (
                      <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-black rounded-md">
                        ADMIN
                      </span>
                    ) : 'Regular User'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Created:</span>
                  <span className="font-semibold">{formatDate(selectedUser.created_at)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Last Login:</span>
                  <span className="font-semibold">
                    {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Login Count:</span>
                  <span className="font-semibold">{selectedUser.login_count || 0}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Trial Status:</span>
                  <span>
                    {selectedUser.hub_trial ? (
                      selectedUser.trial_expiration && new Date(selectedUser.trial_expiration) > new Date() ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClass('trial')}`}>
                          {getTrialStatus(selectedUser)}
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClass('revoked')}`}>
                          EXPIRED
                        </span>
                      )
                    ) : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Session:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                    onlineUsers.has(selectedUser.discord_id)
                      ? getStatusBadgeClass('online')
                      : getStatusBadgeClass('offline')
                  }`}>
                    {onlineUsers.has(selectedUser.discord_id) ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-white/70">Blueprints:</span>
                  <span className="font-semibold">{userBlueprints.length} Selected</span>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-semibold text-[#00c6ff] mb-2">Quick Actions</h3>
                
                <button
                  onClick={() => updateUserStatus(selectedUser.discord_id, !selectedUser.revoked)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold ${
                    selectedUser.revoked
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } transition-colors`}
                >
                  {selectedUser.revoked ? 'Whitelist User' : 'Revoke Access'}
                </button>
                
                {/* New Feature: Convert Trial to Permanent */}
                {selectedUser.hub_trial && selectedUser.trial_expiration && new Date(selectedUser.trial_expiration) > new Date() && (
                  <button
                    onClick={() => convertTrialToPermanent(selectedUser.discord_id)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-black font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Convert Trial to Permanent
                  </button>
                )}
                
                {/* FIXED: Improved trial button colors - changed from dark yellow to lighter, more appealing colors */}
                <button
                  onClick={() => updateTrialTime(selectedUser.discord_id, 7)}
                  className="w-full py-3 px-4 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Add 7 Day Trial
                </button>
                
                <button
                  onClick={() => updateTrialTime(selectedUser.discord_id, 30)}
                  className="w-full py-3 px-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Add 30 Day Trial
                </button>
                
                <button
                  onClick={() => {
                    const days = prompt('Enter number of days for trial:')
                    if (days && !isNaN(Number(days)) && Number(days) > 0) {
                      updateTrialTime(selectedUser.discord_id, Number(days))
                    }
                  }}
                  className="w-full py-3 px-4 bg-[#00c6ff] text-black font-semibold rounded-lg hover:bg-[#00a9db] transition-colors"
                >
                  Custom Trial Duration
                </button>
                
                <button
                  onClick={() => deleteUser(selectedUser.discord_id)}
                  className="w-full py-3 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete User
                </button>
                
                <button
                  onClick={() => {
                    // Show blueprints in a modal or alert
                    alert(`User has ${userBlueprints.length} blueprints selected:\n\n${userBlueprints.join('\n')}`)
                  }}
                  className="w-full py-3 px-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
                >
                  Show Blueprints
                </button>
              </div>
              
              {/* Audit Log */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                <h3 className="text-lg font-semibold text-[#00c6ff] mb-4">Audit Log</h3>
                
                <div className="max-h-[300px] overflow-y-auto space-y-3">
                  {auditLogs
                    .filter(log => log.target_discord_id === selectedUser.discord_id)
                    .slice(0, 10)
                    .map(log => {
                      const actionClass = 
                        log.action?.toLowerCase().includes('whitelist') ? 'bg-green-500/20 border-green-500/30' :
                        log.action?.toLowerCase().includes('revoke') ? 'bg-red-500/20 border-red-500/30' :
                        log.action?.toLowerCase().includes('trial') ? 'bg-yellow-500/20 border-yellow-500/30' :
                        'bg-blue-500/20 border-blue-500/30'
                      
                      return (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            log.action?.toLowerCase().includes('whitelist') ? 'bg-green-500' :
                            log.action?.toLowerCase().includes('revoke') ? 'bg-red-500' :
                            log.action?.toLowerCase().includes('trial') ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}></div>
                          
                          <div className="flex-1">
                            <div className="font-semibold">{log.description}</div>
                            <div className="text-sm text-white/70">by {log.admin_name}</div>
                            <div className="text-xs text-white/50 mt-1">
                              {log.created_at ? formatRelativeTime(log.created_at) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  
                  {auditLogs.filter(log => log.target_discord_id === selectedUser.discord_id).length === 0 && (
                    <div className="text-center py-4 text-white/50">
                      No audit logs for this user
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}