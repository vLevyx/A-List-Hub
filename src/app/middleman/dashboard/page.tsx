"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { createClient } from "@/lib/supabase/client";
import { getDiscordId } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { RequestStatusBadge } from "@/components/RequestStatusBadge";
import { RequestStatusActions } from "@/components/RequestStatusActions";
import { AdminScammerForm } from "@/components/AdminScammerForm";
import Link from "next/link";

// Types
interface MiddlemanRequest {
  id: string;
  user_discord_id: string;
  in_game_name: string;
  item_name: string;
  price: string;
  trade_details: string;
  trade_role: string;
  urgency: string;
  specific_time: string | null;
  preferred_middleman: string;
  negotiable: boolean;
  status: "pending" | "claimed" | "completed" | "cancelled";
  claimed_by?: string | null;
  created_at: string;
  updated_at: string | null;
}

type FilterStatus = "all" | "pending" | "claimed" | "completed" | "cancelled";
type SortBy = "newest" | "oldest" | "urgency" | "price";

export default function MiddlemanDashboard() {
  usePageTracking();
  const router = useRouter();
  const { user, loading, hasAccess } = useAuth();
  const supabase = createClient();

  // State
  const [requests, setRequests] = useState<MiddlemanRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MiddlemanRequest[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMiddleman, setIsMiddleman] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [claimedByNames, setClaimedByNames] = useState<Record<string, string>>(
    {}
  );
  const [showScammerForm, setShowScammerForm] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Check if user is a middleman
  useEffect(() => {
    if (!user) return;

    const checkMiddlemanStatus = async () => {
      try {
        const { data, error } = await supabase.rpc("is_middleman");
        if (error) throw error;
        setIsMiddleman(data === true);
      } catch (error) {
        console.error("Error checking middleman status:", error);
        setIsMiddleman(false);
      }
    };

    checkMiddlemanStatus();
  }, [user, supabase]);

  // Load requests when user becomes middleman
  useEffect(() => {
    if (user && isMiddleman) {
      loadAllRequests();
    }
  }, [user, isMiddleman]);

  // Filter and sort requests with pagination
  useEffect(() => {
    let filtered = requests;

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter((request) => request.status === filter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.item_name.toLowerCase().includes(term) ||
          request.price.toLowerCase().includes(term) ||
          request.trade_details?.toLowerCase().includes(term) ||
          request.user_discord_id.toLowerCase().includes(term) ||
          request.in_game_name.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "urgency":
          const urgencyOrder = { asap: 3, specific: 2, flexible: 1 };
          return (
            urgencyOrder[b.urgency as keyof typeof urgencyOrder] -
            urgencyOrder[a.urgency as keyof typeof urgencyOrder]
          );
        case "price":
          // Simple price sorting (assumes price starts with number)
          const priceA = parseFloat(a.price.replace(/[^0-9.]/g, "")) || 0;
          const priceB = parseFloat(b.price.replace(/[^0-9.]/g, "")) || 0;
          return priceB - priceA;
        default:
          return 0;
      }
    });

    setFilteredRequests(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [requests, filter, sortBy, searchTerm]);

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRequests.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const currentPageItems = getCurrentPageItems();

  const loadAllRequests = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("middleman_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);

      // Load usernames for claimed_by fields
      const claimedByIds = Array.from(
        new Set(data?.filter((r) => r.claimed_by).map((r) => r.claimed_by))
      );
      if (claimedByIds.length > 0) {
        await loadClaimedByNames(claimedByIds);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Discord usernames for claimed_by fields
  const loadClaimedByNames = async (discordIds: string[]) => {
    try {
      // This would typically query your users table or Discord API
      // For now, we'll just use the Discord ID as the display name
      const names: Record<string, string> = {};
      discordIds.forEach((id) => {
        names[id] = id; // You can enhance this to fetch actual usernames
      });
      setClaimedByNames(names);
    } catch (error) {
      console.error("Error loading claimed by names:", error);
    }
  };

  // Handle scammer added callback
  const handleScammerAdded = () => {
    setShowScammerForm(false);
    // Could refresh a scammer list here if displayed
    console.log("Scammer added successfully!");
  };

  // Loading state
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] to-[#1a1a1a]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Access check - must be logged in with access and be a middleman
  if (!user || !hasAccess || !isMiddleman) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] to-[#1a1a1a] p-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/80 mb-6">
            This dashboard is restricted to verified middlemen only.
          </p>
          <div className="space-y-3">
            <Link href="/middleman">
              <Button variant="default" size="lg" className="w-full">
                Return to Middleman Market
              </Button>
            </Link>
            <Button
              onClick={() => router.push("/")}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text mb-2">
            Middleman Dashboard
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto">
            Manage all middleman requests from users. Claim, complete, and track
            trade requests.
          </p>
        </div>

        {/* Scammer Management Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Scammer Management
              </h2>
              <p className="text-white/60 text-sm">
                Add known scammers to protect the community
              </p>
            </div>
            <Button
              onClick={() => setShowScammerForm(!showScammerForm)}
              className={`${
                showScammerForm
                  ? "bg-gray-500 hover:bg-gray-600"
                  : "bg-red-500 hover:bg-red-600"
              } text-white`}
            >
              {showScammerForm ? "Hide Form" : "⚠️ Add Scammer"}
            </Button>
          </div>

          {showScammerForm && (
            <div className="mt-6">
              <AdminScammerForm
                userDiscordId={getDiscordId(user) || ""}
                onScammerAdded={handleScammerAdded}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-white/90 font-medium mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-white/90 font-medium mb-2">
                Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterStatus)}
                className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 12px center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "16px",
                  paddingRight: "40px",
                }}
              >
                <option value="all">All Requests</option>
                <option value="pending">🟡 Pending</option>
                <option value="claimed">🟠 Claimed</option>
                <option value="completed">🟢 Completed</option>
                <option value="cancelled">🔴 Cancelled</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-white/90 font-medium mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 12px center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "16px",
                  paddingRight: "40px",
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="urgency">By Urgency</option>
                <option value="price">By Price</option>
              </select>
            </div>

            {/* Refresh */}
            <div className="flex items-end">
              <Button
                onClick={loadAllRequests}
                variant="secondary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner size="sm" /> : "🔄 Refresh"}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {requests.length}
            </div>
            <div className="text-white/60 text-sm">Total</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {requests.filter((r) => r.status === "pending").length}
            </div>
            <div className="text-yellow-300/80 text-sm">Pending</div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {requests.filter((r) => r.status === "claimed").length}
            </div>
            <div className="text-orange-300/80 text-sm">Claimed</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {requests.filter((r) => r.status === "completed").length}
            </div>
            <div className="text-green-300/80 text-sm">Completed</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {requests.filter((r) => r.status === "cancelled").length}
            </div>
            <div className="text-red-300/80 text-sm">Cancelled</div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center justify-between">
            <span>All Requests</span>
            <span className="text-sm text-white/60">
              Page {currentPage} of {totalPages} • Showing{" "}
              {currentPageItems.length} of {filteredRequests.length} requests
            </span>
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <p className="text-lg mb-2">No requests found</p>
              <p className="text-sm">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentPageItems.map((request) => (
                <div
                  key={request.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-lg">
                        {request.item_name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        Requested by:{" "}
                        <span className="font-mono text-xs">
                          {request.in_game_name} / {request.user_discord_id}
                        </span>
                      </p>
                    </div>
                    <RequestStatusBadge status={request.status} />
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-medium text-white/60">Price:</span>
                      <span className="ml-2 text-white">{request.price}</span>
                      {request.negotiable && (
                        <span className="ml-1 text-green-400">💰</span>
                      )}
                    </div>

                    <div>
                      <span className="font-medium text-white/60">Role:</span>
                      <span className="ml-2 text-white">
                        {request.trade_role === "buyer"
                          ? "🛒 Buyer"
                          : "💰 Seller"}
                      </span>
                    </div>

                    <div>
                      <span className="font-medium text-white/60">
                        Urgency:
                      </span>
                      <span className="ml-2 text-white">
                        {request.urgency === "asap"
                          ? "🔥 ASAP"
                          : request.urgency === "flexible"
                          ? "⏱️ Flexible"
                          : `📅 ${request.specific_time}`}
                      </span>
                    </div>

                    <div>
                      <span className="font-medium text-white/60">
                        Preferred:
                      </span>
                      <span className="ml-2 text-white">
                        {request.preferred_middleman}
                      </span>
                    </div>
                  </div>

                  {/* Trade Details */}
                  {request.trade_details && (
                    <div className="mb-4">
                      <span className="font-medium text-white/60">
                        Details:
                      </span>
                      <p className="mt-1 text-sm text-white/80">
                        {request.trade_details}
                      </p>
                    </div>
                  )}

                  {/* Claimed By */}
                  {request.claimed_by && (
                    <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                      <span className="text-sm font-medium text-orange-300">
                        📩 Claimed by:{" "}
                        <code className="bg-black/20 px-1 py-0.5 rounded text-xs">
                          {claimedByNames[request.claimed_by] ||
                            request.claimed_by}
                        </code>
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <span className="text-sm text-white/50">
                      Created{" "}
                      {new Date(request.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}
                    </span>

                    <RequestStatusActions
                      requestId={request.id}
                      currentStatus={request.status}
                      userDiscordId={getDiscordId(user) || ""}
                      requestOwnerDiscordId={request.user_discord_id}
                      claimedBy={request.claimed_by || undefined}
                      onStatusUpdated={loadAllRequests}
                    />
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 pt-6">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="secondary"
                    className="px-3 py-1"
                  >
                    Previous
                  </Button>

                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            page === currentPage
                              ? "bg-primary-500 text-black"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <Button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    variant="secondary"
                    className="px-3 py-1"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}