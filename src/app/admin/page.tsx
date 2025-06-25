"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { createClient } from "@/lib/supabase/client";
import { getDiscordId, formatDate, timeAgo } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { withTimeout } from "@/lib/timeout";

// Admin IDs that have access
const ADMIN_DISCORD_IDS = [
  "154388953053659137",
  "344637470908088322",
  "796587763851198474",
  "492053410967846933",
  "487476487386038292",
];

// Types
interface User {
  id: string | null;
  discord_id: string;
  username: string | null;
  created_at: string;
  revoked: boolean | null;
  last_login: string | null;
  login_count: number | null;
  hub_trial: boolean | null;
  trial_expiration: string | null;
}

interface AdminLog {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string | null;
  target_discord_id: string | null;
  created_at: string | null;
  description: string | null;
}

interface PageSession {
  id: string;
  discord_id: string;
  username: string | null;
  page_path: string;
  enter_time: string | null;
  exit_time: string | null;
  time_spent_seconds: number | null;
  is_active: boolean | null;
}

interface PageAnalytics {
  page_path: string;
  total_time: number;
  sessions: number;
}

interface UserPageAnalytics {
  page_path: string;
  total_time: number;
  sessions: number;
  avg_time: number;
}

interface StatusMessage {
  type: "success" | "error" | "info" | "warning" | null;
  message: string;
}

export default function AdminPage() {
  usePageTracking();
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  // State for users
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<
    "all" | "whitelisted" | "revoked" | "trial"
  >("all");
  const [userPage, setUserPage] = useState(0);
  const [userLimit, setUserLimit] = useState(15);
  const [userCount, setUserCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userBlueprints, setUserBlueprints] = useState<string[]>([]);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // State for logs
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [logPage, setLogPage] = useState(0);
  const [logLimit, setLogLimit] = useState(15);
  const [logCount, setLogCount] = useState(0);
  const [logFilters, setLogFilters] = useState({
    admin: "",
    action: "",
    target: "",
  });

  // State for analytics
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalytics[]>([]);
  const [topUsers, setTopUsers] = useState<
    { username: string; time_spent: number; sessions: number }[]
  >([]);
  const [selectedAnalyticsUser, setSelectedAnalyticsUser] = useState<
    string | null
  >(null);
  const [userPageAnalytics, setUserPageAnalytics] = useState<
    UserPageAnalytics[]
  >([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const [activeUsers, setActiveUsers] = useState<
    {
      discord_id: string;
      username: string;
      last_activity: string;
      total_sessions: number;
      total_time: number;
    }[]
  >([]);

  // UI state
  const [activeTab, setActiveTab] = useState("users");
  const [loadingState, setLoadingState] = useState({
    users: false,
    logs: false,
    analytics: false,
    action: false,
    refreshing: false,
  });
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    type: null,
    message: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userDetailRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    if (!user) return false;

    const discordId = getDiscordId(user);
    return !!discordId && ADMIN_DISCORD_IDS.includes(discordId);
  }, [user]);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin()) {
      router.push("/");
    }
  }, [loading, isAdmin, router]);

  // Load users with pagination and filtering
  const loadUsers = useCallback(
    async (page = 0, limit = 15, search = "", status = "all") => {
      setLoadingState((prev) => ({ ...prev, users: true }));

      try {
        let query = supabase.from("users").select("*", { count: "exact" });

        // Apply status filter
        if (status === "whitelisted") {
          query = query.eq("revoked", false);
        } else if (status === "revoked") {
          query = query.eq("revoked", true);
        } else if (status === "trial") {
          query = query.eq("hub_trial", true);
        }

        // Apply search filter if provided
        if (search) {
          query = query.or(
            `username.ilike.%${search}%,discord_id.ilike.%${search}%`
          );
        }

        // Get count first
        const { count, error: countError } = await withTimeout(query);

        if (countError) {
          console.error("Error getting user count:", countError);
          return;
        }

        setUserCount(count || 0);

        // Then get paginated data
        const { data, error } = await withTimeout(
          query
            .order("last_login", { ascending: false, nullsFirst: false })
            .range(page * limit, page * limit + limit - 1)
        );

        if (error) {
          console.error("Error loading users:", error);
          return;
        }

        setUsers(data || []);
        setFilteredUsers(data || []);

        // Track online users (last login within 5 minutes)
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        const onlineUserIds = new Set(
          data
            ?.filter(
              (u) => u.last_login && new Date(u.last_login) > fiveMinutesAgo
            )
            .map((u) => u.discord_id) || []
        );

        setOnlineUsers(onlineUserIds);
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoadingState((prev) => ({ ...prev, users: false }));
      }
    },
    [supabase]
  );

  // Load logs with pagination and filtering
  const loadLogs = useCallback(
    async (page = 0, limit = 15, filters = logFilters) => {
      setLoadingState((prev) => ({ ...prev, logs: true }));

      try {
        let query = supabase.from("admin_logs").select("*", { count: "exact" });

        // Apply filters
        if (filters.admin) {
          query = query.ilike("admin_name", `%${filters.admin}%`);
        }
        if (filters.action) {
          query = query.ilike("action", `%${filters.action}%`);
        }
        if (filters.target) {
          query = query.ilike("target_discord_id", `%${filters.target}%`);
        }

        // Get count first
        const { count, error: countError } = await withTimeout(query);

        if (countError) {
          console.error("Error getting log count:", countError);
          return;
        }

        setLogCount(count || 0);

        // Then get paginated data
        const { data, error } = await withTimeout(
          query
            .order("created_at", { ascending: false })
            .range(page * limit, page * limit + limit - 1)
        );

        if (error) {
          console.error("Error loading logs:", error);
          return;
        }

        setLogs(data || []);
      } catch (error) {
        console.error("Failed to load logs:", error);
      } finally {
        setLoadingState((prev) => ({ ...prev, logs: false }));
      }
    },
    [supabase, logFilters]
  );

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    setLoadingState((prev) => ({ ...prev, analytics: true }));

    try {
      // Get page analytics
      const { data: pageData, error: pageError } = await withTimeout(
        supabase.rpc("get_page_analytics")
      );

      if (pageError) {
        console.error("Error loading page analytics:", pageError);
        return;
      }

      setPageAnalytics(pageData || []);

      // Get top users (this already works for analytics)
      const { data: userData, error: userError } = await withTimeout(
        supabase.rpc("get_top_users")
      );

      if (userError) {
        console.error("Error loading top users:", userError);
        return;
      }

      setTopUsers(userData || []);

      // Get online users (for green dots - last 5 minutes)
      const { data: onlineData, error: onlineError } = await withTimeout(
        supabase.rpc("get_online_users")
      );

      if (onlineError) {
        console.error("Error loading online users:", onlineError);
        return;
      }

      setOnlineUsers(
        new Set(onlineData?.map((user: any) => user.discord_id) || [])
      );

      // Get active users (last 24 hours) - NEW!
      const { data: activeData, error: activeError } = await withTimeout(
        supabase.rpc("get_active_users")
      );

      if (activeError) {
        console.error("Error loading active users:", activeError);
        return;
      }

      setActiveUsers(activeData || []);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoadingState((prev) => ({ ...prev, analytics: false }));
    }
  }, [supabase]);

  // Load user-specific page analytics
  const loadUserPageAnalytics = useCallback(
    async (username: string) => {
      if (!username) return;

      try {
        const { data, error } = await withTimeout(
          supabase
            .from("page_sessions")
            .select("page_path, time_spent_seconds")
            .eq("username", username)
            .not("time_spent_seconds", "is", null)
        );

        if (error) {
          console.error("Error loading user page analytics:", error);
          return;
        }

        // Process page data for this user
        const pageMap = new Map<string, { time: number; sessions: number }>();

        data?.forEach((session) => {
          const path = session.page_path;
          const time = session.time_spent_seconds || 0;

          if (!pageMap.has(path)) {
            pageMap.set(path, { time: 0, sessions: 0 });
          }

          const entry = pageMap.get(path)!;
          entry.time += time;
          entry.sessions += 1;
        });

        // Convert to array and sort by time spent
        const userPageAnalytics = Array.from(pageMap.entries()).map(
          ([page_path, data]) => ({
            page_path,
            total_time: data.time,
            sessions: data.sessions,
            avg_time: data.time / data.sessions,
          })
        );

        userPageAnalytics.sort((a, b) => b.total_time - a.total_time);
        setUserPageAnalytics(userPageAnalytics);
      } catch (error) {
        console.error("Failed to load user page analytics:", error);
      }
    },
    [supabase]
  );

  // Load user blueprints
  const loadUserBlueprints = useCallback(
    async (discordId: string) => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("user_blueprints")
            .select("blueprint_name")
            .eq("discord_id", discordId)
        );

        if (error) {
          console.error("Error loading user blueprints:", error);
          return;
        }

        setUserBlueprints(data?.map((bp) => bp.blueprint_name) || []);
      } catch (error) {
        console.error("Failed to load user blueprints:", error);
      }
    },
    [supabase]
  );

  // Initialize data
  useEffect(() => {
    if (!loading && isAdmin()) {
      loadUsers(userPage, userLimit, userSearch, userStatusFilter);
      loadLogs(logPage, logLimit, logFilters);
      loadAnalytics();
    }
  }, [
    loading,
    isAdmin,
    loadUsers,
    loadLogs,
    loadAnalytics,
    userPage,
    userLimit,
    userSearch,
    userStatusFilter,
    logPage,
    logLimit,
    logFilters,
  ]);

  // Load user page analytics when user is selected
  useEffect(() => {
    if (selectedAnalyticsUser) {
      loadUserPageAnalytics(selectedAnalyticsUser);
    } else {
      setUserPageAnalytics([]);
    }
  }, [selectedAnalyticsUser, loadUserPageAnalytics]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isAdmin()) return;

    const usersChannel = supabase
      .channel("admin-users-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          loadUsers(userPage, userLimit, userSearch, userStatusFilter);
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel("admin-logs-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_logs" },
        () => {
          loadLogs(logPage, logLimit, logFilters);
        }
      )
      .subscribe();

    const analyticsChannel = supabase
      .channel("admin-analytics-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "page_sessions" },
        () => {
          // Debounce analytics updates to avoid excessive refreshes
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }

          searchTimeoutRef.current = setTimeout(() => {
            loadAnalytics();
            if (selectedAnalyticsUser) {
              loadUserPageAnalytics(selectedAnalyticsUser);
            }
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(analyticsChannel);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [
    isAdmin,
    loadUsers,
    loadLogs,
    loadAnalytics,
    loadUserPageAnalytics,
    userPage,
    userLimit,
    userSearch,
    userStatusFilter,
    logPage,
    logLimit,
    logFilters,
    selectedAnalyticsUser,
    supabase,
  ]);

  // Real-time log refresh for selected user
  useEffect(() => {
    if (!selectedUser || !isAdmin()) return;

    // Set up real-time subscription for logs related to the selected user
    const userLogsChannel = supabase
      .channel(`user-logs-${selectedUser.discord_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_logs",
          filter: `target_discord_id=eq.${selectedUser.discord_id}`,
        },
        () => {
          // Refresh logs when new log entry is added for this user
          loadLogs(logPage, logLimit, logFilters);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userLogsChannel);
    };
  }, [
    selectedUser,
    isAdmin,
    supabase,
    loadLogs,
    logPage,
    logLimit,
    logFilters,
  ]);

  // Close user detail panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDetailRef.current &&
        !userDetailRef.current.contains(event.target as Node)
      ) {
        setUserDetailOpen(false);
      }
    };

    if (userDetailOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userDetailOpen]);

  // User search with debouncing
  const handleUserSearch = (value: string) => {
    setUserSearch(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setUserPage(0); // Reset to first page
      loadUsers(0, userLimit, value, userStatusFilter);
    }, 300);
  };

  // Format time in minutes and seconds
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Add this function right after your existing formatTime function
  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return "Never";

    const now = new Date();
    const loginDate = new Date(dateString);
    const diffMs = now.getTime() - loginDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 365) {
      return `${diffDays}d ago`;
    } else {
      // Over 365 days - show exact date
      return loginDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  // Admin actions
  const performUserAction = async (
    action: string,
    userId: string,
    username: string
  ) => {
    if (!user) return;

    setLoadingState((prev) => ({ ...prev, action: true }));
    setStatusMessage({ type: null, message: "" });

    try {
      const adminId = getDiscordId(user);
      const adminName =
        user.user_metadata?.full_name || user.user_metadata?.name || "Admin";

      if (!adminId) {
        throw new Error("Could not determine admin ID");
      }

      let description = "";
      let rpcFunction = "";
      let rpcParams: any = {};

      switch (action) {
        case "WHITELIST":
          description = `Whitelisted action performed`;
          rpcFunction = "admin_whitelist_user";
          rpcParams = { target_discord_id: userId };
          break;

        case "REVOKE":
          description = `Revoked access performed`;
          rpcFunction = "admin_revoke_user";
          rpcParams = { target_discord_id: userId };
          break;

        case "TRIAL_7":
          description = `7 Day Trial Action Performed`;
          rpcFunction = "admin_add_trial";
          rpcParams = { target_discord_id: userId, days: 7 };
          break;

        case "TRIAL_30":
          description = `30 Day Trial Action Performed`;
          rpcFunction = "admin_add_trial";
          rpcParams = { target_discord_id: userId, days: 30 };
          break;

        case "CONVERT_TRIAL":
          description = `Converted trial to permanent`;
          rpcFunction = "admin_whitelist_user";
          rpcParams = { target_discord_id: userId };
          break;

        default:
          throw new Error("Invalid action");
      }

      // Create log entry
      const { error: logError } = await withTimeout(
        supabase.from("admin_logs").insert([
          {
            admin_id: adminId,
            admin_name: adminName,
            action,
            target_discord_id: userId,
            description,
          },
        ])
      );

      if (logError) {
        throw logError;
      }

      // Perform the action via RPC if needed
      if (rpcFunction) {
        const { error: rpcError } = await withTimeout(
          supabase.rpc(rpcFunction, rpcParams)
        );

        if (rpcError) {
          throw rpcError;
        }
      }

      // Show success message
      setStatusMessage({
        type: "success",
        message: `Successfully ${action
          .toLowerCase()
          .replace("_", " ")} for user ${username}`,
      });

      // Refresh data
      loadUsers(userPage, userLimit, userSearch, userStatusFilter);

      // **NEW: Auto-refresh the selected user data in the side panel**
      if (selectedUser && selectedUser.discord_id === userId) {
        // Fetch updated user data
        const { data: updatedUserData, error: userError } = await withTimeout(
          supabase.from("users").select("*").eq("discord_id", userId).single()
        );

        if (!userError && updatedUserData) {
          setSelectedUser(updatedUserData);
        }

        // Refresh user blueprints
        loadUserBlueprints(userId);
      }

      // Close user detail panel
      if (action === "CONVERT_TRIAL") {
        setUserDetailOpen(false);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      setStatusMessage({
        type: "error",
        message: `Failed to ${action.toLowerCase().replace("_", " ")}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));

      // Clear status message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ type: null, message: "" });
      }, 3000);
    }
  };

  // Bulk actions
  const performBulkAction = async (action: string) => {
    if (!user || selectedUsers.size === 0) return;

    setLoadingState((prev) => ({ ...prev, action: true }));

    try {
      const adminId = getDiscordId(user);
      const adminName =
        user.user_metadata?.full_name || user.user_metadata?.name || "Admin";

      if (!adminId) {
        throw new Error("Could not determine admin ID");
      }

      const userIds = Array.from(selectedUsers);
      let description = "";
      let updateData: any = {};

      switch (action) {
        case "WHITELIST":
          description = `Bulk whitelisted ${userIds.length} users`;
          updateData = { revoked: false };
          break;

        case "REVOKE":
          description = `Bulk revoked access for ${userIds.length} users`;
          updateData = { revoked: true };
          break;

        case "TRIAL_7":
          description = `Bulk added 7-day trial for ${userIds.length} users`;
          const trialExpiration7 = new Date();
          trialExpiration7.setDate(trialExpiration7.getDate() + 7);
          updateData = {
            hub_trial: true,
            trial_expiration: trialExpiration7.toISOString(),
          };
          break;

        case "TRIAL_30":
          description = `Bulk added 30-day trial for ${userIds.length} users`;
          const trialExpiration30 = new Date();
          trialExpiration30.setDate(trialExpiration30.getDate() + 30);
          updateData = {
            hub_trial: true,
            trial_expiration: trialExpiration30.toISOString(),
          };
          break;

        default:
          throw new Error("Invalid action");
      }

      // Create log entry for bulk action
      const { error: logError } = await withTimeout(
        supabase.from("admin_logs").insert([
          {
            admin_id: adminId,
            admin_name: adminName,
            action: `BULK_${action}`,
            description,
          },
        ])
      );

      if (logError) {
        throw logError;
      }

      // Perform bulk update
      const { error: updateError } = await withTimeout(
        supabase.from("users").update(updateData).in("discord_id", userIds)
      );

      if (updateError) {
        throw updateError;
      }

      // Show success message
      setStatusMessage({
        type: "success",
        message: `Successfully ${action.toLowerCase().replace("_", " ")} for ${
          userIds.length
        } users`,
      });

      // Clear selection
      setSelectedUsers(new Set());

      // Refresh data
      loadUsers(userPage, userLimit, userSearch, userStatusFilter);
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      setStatusMessage({
        type: "error",
        message: `Failed to perform bulk ${action
          .toLowerCase()
          .replace("_", " ")}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));

      // Clear status message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ type: null, message: "" });
      }, 3000);
    }
  };

  // Selection management
  const toggleUserSelection = (discordId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(discordId)) {
        newSet.delete(discordId);
      } else {
        newSet.add(discordId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((user) => user.discord_id)));
    }
  };

  // Open user detail panel
  const openUserDetail = async (user: User) => {
    setSelectedUser(user);
    setUserDetailOpen(true);
    await loadUserBlueprints(user.discord_id);
  };

  // Get trial status
  const getTrialStatus = (user: User) => {
    if (!user.hub_trial) return null;

    if (!user.trial_expiration) {
      return { text: "TRIAL", color: "text-amber-400" };
    }

    const expiration = new Date(user.trial_expiration);
    const now = new Date();

    if (expiration > now) {
      const daysLeft = Math.ceil(
        (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { text: `TRIAL (${daysLeft}d)`, color: "text-amber-400" };
    } else {
      return { text: "EXPIRED", color: "text-red-400" };
    }
  };

  // Format relative time for display
  const getRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }

    const diffDays = diffHours / 24;
    if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    }

    return formatDate(dateString);
  };

  // Analytics statistics
  const analyticsStats = useMemo(() => {
    return {
      totalUsers: activeUsers.length, // Now using 24-hour active users
      totalSessions: pageAnalytics.reduce(
        (sum, page) => sum + page.sessions,
        0
      ),
      avgSessionTime:
        pageAnalytics.length > 0
          ? pageAnalytics.reduce((sum, page) => sum + page.total_time, 0) /
            pageAnalytics.reduce((sum, page) => sum + page.sessions, 0)
          : 0,
      uniquePages: pageAnalytics.length,
    };
  }, [pageAnalytics, activeUsers]);

  // User analytics statistics
  const getUserAnalyticsStats = useMemo(() => {
    if (!selectedAnalyticsUser) {
      return { totalTime: 0, totalSessions: 0, uniquePages: 0 };
    }

    return {
      totalTime: userPageAnalytics.reduce(
        (sum, page) => sum + page.total_time,
        0
      ),
      totalSessions: userPageAnalytics.reduce(
        (sum, page) => sum + page.sessions,
        0
      ),
      uniquePages: userPageAnalytics.length,
    };
  }, [selectedAnalyticsUser, userPageAnalytics]);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text">
              Admin Dashboard
            </h1>
            <p className="text-white/60 mt-1">
              Manage users, view logs, and analyze usage
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/">
              <Button variant="secondary" size="default">
                ← Back to Home
              </Button>
            </Link>

            <Button
              variant="default"
              onClick={() => {
                loadUsers(userPage, userLimit, userSearch, userStatusFilter);
                loadLogs(logPage, logLimit, logFilters);
                loadAnalytics();
              }}
              disabled={loadingState.refreshing}
            >
              {loadingState.refreshing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Refreshing...
                </>
              ) : (
                "Refresh Data"
              )}
            </Button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage.type && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              statusMessage.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : statusMessage.type === "error"
                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                : statusMessage.type === "warning"
                ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
                : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
            }`}
          >
            {statusMessage.message}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-white/10">
          <div className="flex space-x-6">
            <button
              className={`pb-3 px-1 font-medium ${
                activeTab === "users"
                  ? "text-[#00c6ff] border-b-2 border-[#00c6ff]"
                  : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("users")}
            >
              User Management
            </button>
            <button
              className={`pb-3 px-1 font-medium ${
                activeTab === "analytics"
                  ? "text-[#00c6ff] border-b-2 border-[#00c6ff]"
                  : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </button>
            <button
              className={`pb-3 px-1 font-medium ${
                activeTab === "logs"
                  ? "text-[#00c6ff] border-b-2 border-[#00c6ff]"
                  : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("logs")}
            >
              Audit Logs
            </button>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    placeholder="Search by username or Discord ID"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">
                    🔍
                  </span>
                </div>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value as any);
                    setUserPage(0);
                    loadUsers(0, userLimit, userSearch, e.target.value as any);
                  }}
                  className="px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                >
                  <option value="all">All Users</option>
                  <option value="whitelisted">Whitelisted</option>
                  <option value="revoked">Revoked</option>
                  <option value="trial">Trial</option>
                </select>

                <select
                  value={userLimit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setUserLimit(newLimit);
                    setUserPage(0);
                    loadUsers(0, newLimit, userSearch, userStatusFilter);
                  }}
                  className="px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                >
                  <option value="15">15 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white hover:bg-[#3a3a3a] transition-colors"
                >
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="p-4 bg-[#2a2a2a] rounded-lg mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      Add New User
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Discord ID"
                        className="flex-1 px-3 py-2 bg-[#3a3a3a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00c6ff]"
                      />
                      <button className="px-3 py-2 bg-[#00c6ff] text-black font-medium rounded-lg hover:bg-[#00b8ee] transition-colors">
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      Bulk Actions
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => performBulkAction("WHITELIST")}
                        disabled={selectedUsers.size === 0}
                        className="px-3 py-2 bg-green-600/80 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Whitelist
                      </button>
                      <button
                        onClick={() => performBulkAction("REVOKE")}
                        disabled={selectedUsers.size === 0}
                        className="px-3 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Revoke
                      </button>
                      <button
                        onClick={() => performBulkAction("TRIAL_7")}
                        disabled={selectedUsers.size === 0}
                        className="px-3 py-2 bg-amber-500/80 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        7d Trial
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      Selection
                    </label>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">
                        {selectedUsers.size} users selected
                      </span>
                      <button
                        onClick={() => setSelectedUsers(new Set())}
                        disabled={selectedUsers.size === 0}
                        className="px-3 py-2 bg-[#3a3a3a] text-white rounded-lg hover:bg-[#4a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2a2a2a]">
                    <tr>
                      <th className="p-4 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectedUsers.size === filteredUsers.length &&
                            filteredUsers.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded bg-white/10 border-white/30 text-[#00c6ff] focus:ring-[#00c6ff]/30"
                        />
                      </th>
                      <th className="p-4 text-left text-[#00c6ff] font-medium">
                        User
                      </th>
                      <th className="p-4 text-left text-[#00c6ff] font-medium">
                        Status
                      </th>
                      <th className="p-4 text-left text-[#00c6ff] font-medium">
                        Last Login
                      </th>
                      <th className="p-4 text-left text-[#00c6ff] font-medium">
                        Login Count
                      </th>
                      <th className="p-4 text-left text-[#00c6ff] font-medium">
                        Trial Status
                      </th>
                      <th className="p-4 text-left text-[#00c6ff] font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingState.users ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <LoadingSpinner size="md" className="mx-auto" />
                          <p className="mt-2 text-white/60">Loading users...</p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-white/60"
                        >
                          No users found matching your criteria
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.discord_id}
                          className="hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => openUserDetail(user)}
                        >
                          <td
                            className="p-4"
                            onClick={(e) =>
                              toggleUserSelection(user.discord_id, e)
                            }
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.discord_id)}
                              onChange={() => {}}
                              className="w-4 h-4 rounded bg-white/10 border-white/30 text-[#00c6ff] focus:ring-[#00c6ff]/30"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                  onlineUsers.has(user.discord_id)
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                                }`}
                              ></div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {user.username || "Unknown User"}
                                  {ADMIN_DISCORD_IDS.includes(
                                    user.discord_id
                                  ) && (
                                    <span className="px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-black rounded">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-white/60 font-mono">
                                  {user.discord_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                user.revoked === false
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {user.revoked === false
                                ? "WHITELISTED"
                                : "REVOKED"}
                            </span>
                          </td>
                          <td className="p-4 text-white/80">
                            {formatLastLogin(user.last_login)}
                          </td>
                          <td className="p-4 text-white/80">
                            {user.login_count || 0}
                          </td>
                          <td className="p-4">
                            {user.hub_trial ? (
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  user.trial_expiration &&
                                  new Date(user.trial_expiration) > new Date()
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                }`}
                              >
                                {getTrialStatus(user)?.text || "TRIAL"}
                              </span>
                            ) : (
                              <span className="text-white/40">N/A</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  performUserAction(
                                    user.revoked === false
                                      ? "REVOKE"
                                      : "WHITELIST",
                                    user.discord_id,
                                    user.username || "Unknown"
                                  );
                                }}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  user.revoked === false
                                    ? "bg-red-600/80 text-white hover:bg-red-600"
                                    : "bg-green-600/80 text-white hover:bg-green-600"
                                } transition-colors`}
                              >
                                {user.revoked === false
                                  ? "Revoke"
                                  : "Whitelist"}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  performUserAction(
                                    "TRIAL_7",
                                    user.discord_id,
                                    user.username || "Unknown"
                                  );
                                }}
                                className="px-3 py-1 bg-amber-500/80 text-white rounded text-xs font-medium hover:bg-amber-500 transition-colors"
                              >
                                7d Trial
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 border-t border-white/10">
                <div className="text-sm text-white/60">
                  Showing {userPage * userLimit + 1}-
                  {Math.min((userPage + 1) * userLimit, userCount)} of{" "}
                  {userCount} users
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const newPage = Math.max(0, userPage - 1);
                      setUserPage(newPage);
                      loadUsers(
                        newPage,
                        userLimit,
                        userSearch,
                        userStatusFilter
                      );
                    }}
                    disabled={userPage === 0}
                    className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => {
                      const newPage = userPage + 1;
                      setUserPage(newPage);
                      loadUsers(
                        newPage,
                        userLimit,
                        userSearch,
                        userStatusFilter
                      );
                    }}
                    disabled={(userPage + 1) * userLimit >= userCount}
                    className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">
                  {onlineUsers.size}
                </div>
                <div className="text-sm text-white/60">Currently Online</div>
                <div className="text-xs text-white/40 mt-1">
                  (Last 5 minutes)
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">
                  {analyticsStats.totalUsers}
                </div>
                <div className="text-sm text-white/60">Active Users</div>
                <div className="text-xs text-white/40 mt-1">
                  (Last 24 hours)
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">
                  {analyticsStats.totalSessions}
                </div>
                <div className="text-sm text-white/60">Total Sessions</div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">
                  {(analyticsStats.avgSessionTime / 60).toFixed(1)}m
                </div>
                <div className="text-sm text-white/60">Avg Session Time</div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">
                  {analyticsStats.uniquePages}
                </div>
                <div className="text-sm text-white/60">Unique Pages</div>
              </div>
            </div>

            {/* Top Pages and User Analytics */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Top Pages */}
              <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-4">
                  <h2 className="text-xl font-semibold text-[#00c6ff]">
                    Top Pages by Time Spent
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2a2a2a]">
                      <tr>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Rank
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Page
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Total Time
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Sessions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingState.analytics ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center">
                            <LoadingSpinner size="md" className="mx-auto" />
                            <p className="mt-2 text-white/60">
                              Loading analytics...
                            </p>
                          </td>
                        </tr>
                      ) : pageAnalytics.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-8 text-center text-white/60"
                          >
                            No page analytics data available
                          </td>
                        </tr>
                      ) : (
                        pageAnalytics.slice(0, 15).map((page, index) => (
                          <tr
                            key={page.page_path}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="p-4 font-medium text-white/80">
                              #{index + 1}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-[#2a2a2a] rounded text-sm font-mono">
                                {page.page_path}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-white/90">
                              {formatTime(page.total_time)}
                            </td>
                            <td className="p-4 text-white/80">
                              {page.sessions}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Users (24 Hour) */}
              <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-4">
                  <h2 className="text-xl font-semibold text-[#00c6ff]">
                    Active Users (Last 24 Hours)
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2a2a2a]">
                      <tr>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          User
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Status
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Sessions
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Total Time
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Last Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingState.analytics ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <LoadingSpinner size="md" className="mx-auto" />
                            <p className="mt-2 text-white/60">
                              Loading active users...
                            </p>
                          </td>
                        </tr>
                      ) : activeUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-white/60"
                          >
                            No active users in the last 24 hours
                          </td>
                        </tr>
                      ) : (
                        activeUsers.slice(0, 20).map((user, index) => (
                          <tr
                            key={user.discord_id}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#00c6ff] flex items-center justify-center text-xs font-bold text-white">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-white/90">
                                    {user.username || "Unknown"}
                                  </div>
                                  <div className="text-xs text-white/60 font-mono">
                                    {user.discord_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    onlineUsers.has(user.discord_id)
                                      ? "bg-green-500"
                                      : "bg-gray-500"
                                  }`}
                                ></div>
                                <span className="text-sm">
                                  {onlineUsers.has(user.discord_id)
                                    ? "Online"
                                    : "Offline"}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-white/80">
                              {user.total_sessions}
                            </td>
                            <td className="p-4 font-medium text-white/90">
                              {formatTime(user.total_time)}
                            </td>
                            <td className="p-4 text-white/80">
                              {timeAgo(user.last_activity)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User Page Analytics */}
              <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-4">
                  <h2 className="text-xl font-semibold text-[#00c6ff]">
                    User Page Analytics
                  </h2>
                </div>

                <div className="p-4">
                  <select
                    value={selectedAnalyticsUser || ""}
                    onChange={(e) =>
                      setSelectedAnalyticsUser(e.target.value || null)
                    }
                    className="w-full p-2.5 mb-4 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                  >
                    <option value="">Select a user...</option>
                    {topUsers.map((user) => (
                      <option key={user.username} value={user.username}>
                        {user.username}
                      </option>
                    ))}
                  </select>

                  {selectedAnalyticsUser && (
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-[#2a2a2a] rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-[#00c6ff] mb-1">
                          {formatTime(getUserAnalyticsStats.totalTime)}
                        </div>
                        <div className="text-xs text-white/60">Total Time</div>
                      </div>

                      <div className="bg-[#2a2a2a] rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-[#00c6ff] mb-1">
                          {getUserAnalyticsStats.totalSessions}
                        </div>
                        <div className="text-xs text-white/60">
                          Total Sessions
                        </div>
                      </div>

                      <div className="bg-[#2a2a2a] rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-[#00c6ff] mb-1">
                          {getUserAnalyticsStats.uniquePages}
                        </div>
                        <div className="text-xs text-white/60">
                          Unique Pages
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2a2a2a]">
                        <tr>
                          <th className="p-4 text-left text-[#00c6ff] font-medium">
                            Page
                          </th>
                          <th className="p-4 text-left text-[#00c6ff] font-medium">
                            Sessions
                          </th>
                          <th className="p-4 text-left text-[#00c6ff] font-medium">
                            Total Time
                          </th>
                          <th className="p-4 text-left text-[#00c6ff] font-medium">
                            Avg Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {!selectedAnalyticsUser ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-8 text-center text-white/60"
                            >
                              Select a user to view their page analytics
                            </td>
                          </tr>
                        ) : loadingState.analytics ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center">
                              <LoadingSpinner size="md" className="mx-auto" />
                              <p className="mt-2 text-white/60">
                                Loading user analytics...
                              </p>
                            </td>
                          </tr>
                        ) : userPageAnalytics.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-8 text-center text-white/60"
                            >
                              No page analytics data available for this user
                            </td>
                          </tr>
                        ) : (
                          userPageAnalytics.map((page) => (
                            <tr
                              key={page.page_path}
                              className="hover:bg-white/5 transition-colors"
                            >
                              <td className="p-4">
                                <span className="px-2 py-1 bg-[#2a2a2a] rounded text-sm font-mono">
                                  {page.page_path}
                                </span>
                              </td>
                              <td className="p-4 text-white/80">
                                {page.sessions}
                              </td>
                              <td className="p-4 font-medium text-white/90">
                                {formatTime(page.total_time)}
                              </td>
                              <td className="p-4 text-white/80">
                                {formatTime(page.avg_time)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
              <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-4">
                <h2 className="text-xl font-semibold text-[#00c6ff]">
                  Admin Audit Logs
                </h2>
              </div>

              <div className="p-4">
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    value={logFilters.admin}
                    onChange={(e) =>
                      setLogFilters({ ...logFilters, admin: e.target.value })
                    }
                    placeholder="Filter by admin"
                    className="flex-1 min-w-[200px] p-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                  />

                  <input
                    value={logFilters.action}
                    onChange={(e) =>
                      setLogFilters({ ...logFilters, action: e.target.value })
                    }
                    placeholder="Filter by action"
                    className="flex-1 min-w-[200px] p-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                  />

                  <input
                    value={logFilters.target}
                    onChange={(e) =>
                      setLogFilters({ ...logFilters, target: e.target.value })
                    }
                    placeholder="Filter by target"
                    className="flex-1 min-w-[200px] p-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                  />

                  <select
                    value={logLimit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value);
                      setLogLimit(newLimit);
                      setLogPage(0);
                      loadLogs(0, newLimit, logFilters);
                    }}
                    className="p-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30"
                  >
                    <option value="15">15 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2a2a2a]">
                      <tr>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Admin
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Action
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Description
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Target
                        </th>
                        <th className="p-4 text-left text-[#00c6ff] font-medium">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingState.logs ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <LoadingSpinner size="md" className="mx-auto" />
                            <p className="mt-2 text-white/60">
                              Loading logs...
                            </p>
                          </td>
                        </tr>
                      ) : logs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-white/60"
                          >
                            No logs found matching your criteria
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => {
                          const targetUser = users.find(
                            (u) => u.discord_id === log.target_discord_id
                          );

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-white/5 transition-colors"
                            >
                              <td className="p-4 font-medium">
                                {log.admin_name}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                    log.action
                                      ?.toLowerCase()
                                      .includes("whitelist")
                                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                      : log.action
                                          ?.toLowerCase()
                                          .includes("revoke")
                                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                      : log.action
                                          ?.toLowerCase()
                                          .includes("trial")
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  }`}
                                >
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-4 text-white/80">
                                {log.description}
                              </td>
                              <td className="p-4 text-white/80">
                                {targetUser?.username ||
                                  log.target_discord_id ||
                                  "N/A"}
                              </td>
                              <td className="p-4 text-white/80">
                                {formatDate(log.created_at)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-white/60">
                    Showing {logPage * logLimit + 1}-
                    {Math.min((logPage + 1) * logLimit, logCount)} of {logCount}{" "}
                    logs
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const newPage = Math.max(0, logPage - 1);
                        setLogPage(newPage);
                        loadLogs(newPage, logLimit, logFilters);
                      }}
                      disabled={logPage === 0}
                      className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <button
                      onClick={() => {
                        const newPage = logPage + 1;
                        setLogPage(newPage);
                        loadLogs(newPage, logLimit, logFilters);
                      }}
                      disabled={(logPage + 1) * logLimit >= logCount}
                      className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Panel */}
      {userDetailOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setUserDetailOpen(false)}
          ></div>

          <div
            ref={userDetailRef}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-[#1a1a1a] border-l border-white/10 overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-[#1a1a1a] border-b border-white/10 p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#00c6ff]">
                User Details
              </h2>
              <button
                onClick={() => setUserDetailOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      onlineUsers.has(selectedUser.discord_id)
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                  ></div>
                  <h3 className="text-xl font-semibold">
                    {selectedUser.username || "Unknown User"}
                  </h3>
                </div>

                <div className="text-sm font-mono text-white/60 bg-[#2a2a2a] p-2 rounded">
                  {selectedUser.discord_id}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#2a2a2a] p-3 rounded-lg">
                    <div className="text-xs text-white/60 mb-1">Status</div>
                    <div className="font-medium">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedUser.revoked === false
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {selectedUser.revoked === false
                          ? "WHITELISTED"
                          : "REVOKED"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#2a2a2a] p-3 rounded-lg">
                    <div className="text-xs text-white/60 mb-1">Trial</div>
                    <div className="font-medium">
                      {selectedUser.hub_trial ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            selectedUser.trial_expiration &&
                            new Date(selectedUser.trial_expiration) > new Date()
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {getTrialStatus(selectedUser)?.text || "TRIAL"}
                        </span>
                      ) : (
                        <span className="text-white/40">N/A</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#2a2a2a] p-3 rounded-lg">
                    <div className="text-xs text-white/60 mb-1">Created</div>
                    <div className="font-medium">
                      {formatDate(selectedUser.created_at)}
                    </div>
                  </div>

                  <div className="bg-[#2a2a2a] p-3 rounded-lg">
                    <div className="text-xs text-white/60 mb-1">Last Login</div>
                    <div className="font-medium">
                      {formatLastLogin(selectedUser.last_login)}
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a2a2a] p-3 rounded-lg">
                  <div className="text-xs text-white/60 mb-1">Login Count</div>
                  <div className="font-medium">
                    {selectedUser.login_count || 0}
                  </div>
                </div>
              </div>

              {/* Blueprints */}
              <div>
                <h3 className="text-lg font-semibold text-[#00c6ff] mb-3">
                  Blueprints
                </h3>

                {userBlueprints.length === 0 ? (
                  <div className="text-center py-4 text-white/60 bg-[#2a2a2a] rounded-lg">
                    No blueprints selected
                  </div>
                ) : (
                  <div className="bg-[#2a2a2a] p-3 rounded-lg max-h-[200px] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {userBlueprints.map((blueprint) => (
                        <div
                          key={blueprint}
                          className="px-3 py-2 bg-[#3a3a3a] rounded text-sm"
                        >
                          {blueprint}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div>
                <h3 className="text-lg font-semibold text-[#00c6ff] mb-3">
                  Actions
                </h3>

                <div className="space-y-3">
                  <button
                    onClick={() =>
                      performUserAction(
                        selectedUser.revoked === false ? "REVOKE" : "WHITELIST",
                        selectedUser.discord_id,
                        selectedUser.username || "Unknown"
                      )
                    }
                    className={`w-full py-2.5 px-4 rounded-lg font-medium ${
                      selectedUser.revoked === false
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    } transition-colors`}
                  >
                    {selectedUser.revoked === false
                      ? "Revoke Access"
                      : "Whitelist User"}
                  </button>

                  {selectedUser.hub_trial &&
                    selectedUser.trial_expiration &&
                    new Date(selectedUser.trial_expiration) > new Date() && (
                      <button
                        onClick={() =>
                          performUserAction(
                            "CONVERT_TRIAL",
                            selectedUser.discord_id,
                            selectedUser.username || "Unknown"
                          )
                        }
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-black font-medium rounded-lg hover:from-[#ffed4e] hover:to-[#ffd700] transition-colors"
                      >
                        Convert Trial to Premium
                      </button>
                    )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        performUserAction(
                          "TRIAL_7",
                          selectedUser.discord_id,
                          selectedUser.username || "Unknown"
                        )
                      }
                      className="py-2.5 px-4 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      7 Day Trial
                    </button>

                    <button
                      onClick={() =>
                        performUserAction(
                          "TRIAL_30",
                          selectedUser.discord_id,
                          selectedUser.username || "Unknown"
                        )
                      }
                      className="py-2.5 px-4 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      30 Day Trial
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Are you sure you want to delete user ${
                            selectedUser.username || selectedUser.discord_id
                          }? This action cannot be undone.`
                        )
                      ) {
                        // Delete user logic
                        setUserDetailOpen(false);
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-red-600/80 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete User
                  </button>
                </div>
              </div>

              {/* Recent Logs */}
              <div>
                <h3 className="text-lg font-semibold text-[#00c6ff] mb-3">
                  Recent Activity
                </h3>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {logs
                    .filter(
                      (log) => log.target_discord_id === selectedUser.discord_id
                    )
                    .slice(0, 5)
                    .map((log) => (
                      <div key={log.id} className="bg-[#2a2a2a] p-3 rounded-lg">
                        <div className="flex items-start gap-3">
                          <span
                            className={`inline-block w-2 h-2 rounded-full mt-2 ${
                              log.action?.toLowerCase().includes("whitelist")
                                ? "bg-green-500"
                                : log.action?.toLowerCase().includes("revoke")
                                ? "bg-red-500"
                                : log.action?.toLowerCase().includes("trial")
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                          ></span>
                          <div>
                            <div className="font-medium">{log.description}</div>
                            <div className="text-sm text-white/60 mt-1">
                              by {log.admin_name} •{" "}
                              {formatLastLogin(log.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                  {logs.filter(
                    (log) => log.target_discord_id === selectedUser.discord_id
                  ).length === 0 && (
                    <div className="text-center py-4 text-white/60 bg-[#2a2a2a] rounded-lg">
                      No activity logs found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
