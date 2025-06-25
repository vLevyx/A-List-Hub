"use client";

import { useState, useEffect, useRef, ReactElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { createClient } from "@/lib/supabase/client";
import { getDiscordId, getUsername } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { RequestStatusBadge } from "@/components/RequestStatusBadge";
import { withTimeout } from "@/lib/timeout";

// Constants
const RATE_LIMIT_MINUTES = 60;
const RATE_LIMIT_KEY = "middleman_last_request";
const MIDDLEMEN = [
  "First Available",
  "Levy Lowry",
  "Alexa Knox",
  "Chee Masters",
  "Hamish Macbeth",
] as const;

// Types
type UrgencyLevel = "asap" | "flexible" | "specific";
type TradeRole = "buyer" | "seller";

interface FormData {
  itemName: string;
  price: string;
  tradeDetails: string;
  tradeRole: TradeRole;
  urgency: UrgencyLevel;
  specificTime?: string;
  preferredMiddleman: (typeof MIDDLEMEN)[number];
  negotiable: boolean;
  inGameName: string;
}

interface RequestHistory {
  id: string;
  user_discord_id: string;
  in_game_name: string;
  item_name: string;
  price: string;
  trade_details: string;
  trade_role: TradeRole;
  urgency: UrgencyLevel;
  specific_time: string | null;
  preferred_middleman: (typeof MIDDLEMEN)[number];
  negotiable: boolean;
  status: "pending" | "claimed" | "completed" | "cancelled";
  claimed_by?: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Scammer {
  id: string;
  in_game_name: string;
  discord_name?: string | null;
  verified: boolean;
  description?: string | null;
  created_at: string;
}

export default function MiddlemanMarketPage(): ReactElement {
  usePageTracking();
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    itemName: "",
    price: "",
    tradeDetails: "",
    tradeRole: "seller",
    urgency: "asap",
    specificTime: "",
    preferredMiddleman: "First Available",
    negotiable: false,
    inGameName: "",
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "warning" | null;
    message: string;
  }>({ type: null, message: "" });
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [scamList, setScamList] = useState<Scammer[]>([]);
  const [isLoadingScamList, setIsLoadingScamList] = useState(false);
  const [claimedByNames, setClaimedByNames] = useState<Record<string, string>>(
    {}
  );
  const [scamListPage, setScamListPage] = useState(0);
  const [allScammers, setAllScammers] = useState<Scammer[]>([]);
  const [filteredScammers, setFilteredScammers] = useState<Scammer[]>([]);
  const [scammerSearch, setScammerSearch] = useState("");
  const [showAllScammers, setShowAllScammers] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Rate-limit timer on mount
  useEffect(() => {
    if (!user) return;
    const last = localStorage.getItem(RATE_LIMIT_KEY);
    if (!last) return;

    const elapsed = (Date.now() - parseInt(last, 10)) / 60000;
    if (elapsed < RATE_LIMIT_MINUTES) {
      const remaining = Math.ceil(RATE_LIMIT_MINUTES - elapsed);
      setTimeRemaining(remaining);
      startRateLimitTimer(remaining);
    }
  }, [user]);

  // Load data when user arrives
  useEffect(() => {
    if (user) {
      loadRequestHistory();
      loadScamList();
    }
  }, [user]);

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  // Fetch only this user's requests
  const loadRequestHistory = async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const discordId = getDiscordId(user);
      if (!discordId) return;

      const { data, error } = await withTimeout(
        supabase
          .from("middleman_requests")
          .select("*")
          .eq("user_discord_id", discordId)
          .order("created_at", { ascending: false })
          .limit(10)
      );

      if (error) throw error;

      setRequestHistory(data || []);

      // Load usernames for claimed_by fields
      const claimedByIds = Array.from(
        new Set(data?.filter((r) => r.claimed_by).map((r) => r.claimed_by))
      );
      if (claimedByIds.length > 0) {
        await loadClaimedByNames(claimedByIds);
      }
    } catch (error) {
      console.error("Error loading request history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadClaimedByNames = async (discordIds: string[]) => {
    try {
      // Query the users table to get usernames for the provided Discord IDs
      const { data, error } = await supabase
        .from("users")
        .select("discord_id, username")
        .in("discord_id", discordIds);

      if (error) {
        console.error("Error querying users for claimed_by names:", error);
        // Fallback to Discord IDs if query fails
        const fallbackNames: Record<string, string> = {};
        discordIds.forEach((id) => {
          fallbackNames[id] = id;
        });
        setClaimedByNames(fallbackNames);
        return;
      }

      // Map Discord IDs to usernames
      const names: Record<string, string> = {};

      // Create a map from the database results
      const userMap = new Map(
        data?.map((user) => [user.discord_id, user.username]) || []
      );

      // For each requested Discord ID, use username if available, otherwise fallback to ID
      discordIds.forEach((id) => {
        const username = userMap.get(id);
        names[id] = username || id; // Fallback to Discord ID if username not found
      });

      setClaimedByNames(names);
    } catch (error) {
      console.error("Error loading claimed by names:", error);
      // Fallback to Discord IDs in case of any error
      const fallbackNames: Record<string, string> = {};
      discordIds.forEach((id) => {
        fallbackNames[id] = id;
      });
      setClaimedByNames(fallbackNames);
    }
  };

  // Fetch the last 10 scammers
  const loadScamList = async () => {
    setIsLoadingScamList(true);
    try {
      // Load recent scammers for the main display (5 most recent)
      const { data: recentData, error: recentError } = await withTimeout(
        supabase
          .from("scam_list")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5)
      );
      if (recentError) throw recentError;
      setScamList(recentData as Scammer[]);

      // Load all scammers for the "Show All" modal
      const { data: allData, error: allError } = await withTimeout(
        supabase
          .from("scam_list")
          .select("*")
          .order("created_at", { ascending: false })
      );
      if (allError) throw allError;
      setAllScammers(allData as Scammer[]);
      setFilteredScammers(allData as Scammer[]);
    } catch (err) {
      console.error("Error loading scam list:", err);
    } finally {
      setIsLoadingScamList(false);
    }
  };

  // Add this new function for handling scammer search
  const handleScammerSearch = (searchTerm: string) => {
    setScammerSearch(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredScammers(allScammers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allScammers.filter(
      (scammer) =>
        scammer.in_game_name.toLowerCase().includes(term) ||
        (scammer.discord_name &&
          scammer.discord_name.toLowerCase().includes(term))
    );
    setFilteredScammers(filtered);
  };

  // Add this function for pagination in the main list
  const getDisplayedScammers = () => {
    const ITEMS_PER_PAGE = 5;
    const startIndex = scamListPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return scamList.slice(startIndex, endIndex);
  };

  // Timer helper
  const startRateLimitTimer = (minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let seconds = minutes * 60;
    timerRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeRemaining(null);
      } else {
        setTimeRemaining(Math.ceil(seconds / 60));
      }
    }, 1000);
  };

  // Form handlers
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.checked }));
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setStatusMessage({ type: "error", message: "Please log in first." });
      return;
    }

    // Rate-limit check
    const last = localStorage.getItem(RATE_LIMIT_KEY);
    if (
      last &&
      (Date.now() - parseInt(last, 10)) / 60000 < RATE_LIMIT_MINUTES
    ) {
      setStatusMessage({
        type: "warning",
        message: `Wait a bit before sending another request.`,
      });
      return;
    }

    // Validation
    if (
      !formData.itemName.trim() ||
      !formData.price.trim() ||
      !formData.inGameName.trim()
    ) {
      setStatusMessage({
        type: "error",
        message: "All required fields must be filled.",
      });
      return;
    }
    if (formData.urgency === "specific" && !formData.specificTime?.trim()) {
      setStatusMessage({
        type: "error",
        message: "Please specify the trade time.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ type: null, message: "" });

    try {
      const discordId = getDiscordId(user);
      const { data: sessionData } = await withTimeout(
        supabase.auth.getSession()
      );
      const token = sessionData.session?.access_token || "";

      const { data: result, error } = await withTimeout(
        supabase.functions.invoke("send-middleman-request", {
          body: {
            ...formData,
            discordId,
            timestamp: new Date().toISOString(),
          },
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      if (error) throw error;
      if (!(result as any).success) throw new Error((result as any).error);

      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
      setStatusMessage({
        type: "success",
        message: "Request sent! A middleman will reach out soon.",
      });
      formRef.current?.reset();
      setFormData({
        itemName: "",
        price: "",
        tradeDetails: "",
        tradeRole: "seller",
        urgency: "asap",
        specificTime: "",
        preferredMiddleman: "First Available",
        negotiable: false,
        inGameName: "",
      });
      setTimeRemaining(RATE_LIMIT_MINUTES);
      startRateLimitTimer(RATE_LIMIT_MINUTES);
      await loadRequestHistory();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        message: err.message || "Submission failed. Try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel a user's own request
  const cancelRequest = async (requestId: string) => {
    try {
      const { data: sessionData } = await withTimeout(
        supabase.auth.getSession()
      );
      const token = sessionData.session?.access_token || "";
      const { data: result, error } = await withTimeout(
        supabase.functions.invoke("update-request-status", {
          body: { requestId, newStatus: "cancelled" },
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      if (error) throw error;
      if (!(result as any).success) throw new Error((result as any).error);
      await loadRequestHistory();
    } catch (err: any) {
      console.error(err);
      alert(`Could not cancel: ${err.message}`);
    }
  };

  // Loading and access guards
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] to-[#1a1a1a]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] to-[#1a1a1a] p-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Login Required</h2>
          <p className="text-white/80 mb-6">
            The Middleman Market is a non-premium service to use but requires
            Discord login for verification purposes.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/")}
              variant="default"
              size="lg"
              className="w-full"
            >
              Return to Home & Login
            </Button>
            <p className="text-white/60 text-sm">
              ⭐ <strong>Non-Premium Service</strong> - No premium subscription
              required!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text mb-2">
            Middleman Market
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto">
            Request a trusted middleman to facilitate secure trades in ELAN
            Life.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Form */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm">
                  1
                </span>
                Request a Middleman
              </h2>

              {timeRemaining ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg mb-4">
                  <p className="flex items-center">
                    <span className="mr-2">⏳</span>
                    Please wait {timeRemaining} minute
                    {timeRemaining !== 1 ? "s" : ""} before making another
                    request.
                  </p>
                </div>
              ) : (
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Item Name */}
                  <div>
                    <label
                      htmlFor="itemName"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Item Name: <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="itemName"
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleInputChange}
                      placeholder="e.g., Gold RPK-74, Special Rotor"
                      className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                      required
                    />
                  </div>
                  {/* In-Game Name */}
                  <div>
                    <label
                      htmlFor="inGameName"
                      className="block text-white/90 font-medium mb-2"
                    >
                      In-Game Name: <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="inGameName"
                      name="inGameName"
                      value={formData.inGameName}
                      onChange={handleInputChange}
                      placeholder="Your character/player name"
                      className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                      required
                    />
                  </div>
                  {/* Price */}
                  <div>
                    <label
                      htmlFor="price"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Price: <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="e.g., ELAN$100,000, M16A4 - AUTO"
                      className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                      required
                    />
                  </div>
                  {/* Details */}
                  <div>
                    <label
                      htmlFor="tradeDetails"
                      className="block text-white/90 font-medium mb-1"
                    >
                      Trade Details / Island number and location
                    </label>
                    <textarea
                      id="tradeDetails"
                      name="tradeDetails"
                      value={formData.tradeDetails}
                      onChange={handleInputChange}
                      placeholder="Island number, location, and any additional details..."
                      rows={3}
                      className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  {/* Role & Urgency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trade Role */}
                    <div>
                      <label
                        htmlFor="tradeRole"
                        className="block text-white/90 font-medium mb-2"
                      >
                        I am the:
                      </label>
                      <select
                        id="tradeRole"
                        name="tradeRole"
                        value={formData.tradeRole}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: "right 12px center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "16px",
                          paddingRight: "40px",
                        }}
                      >
                        <option value="buyer">🛒 Buyer</option>
                        <option value="seller">💰 Seller</option>
                      </select>
                    </div>

                    {/* Urgency */}
                    <div>
                      <label
                        htmlFor="urgency"
                        className="block text-white/90 font-medium mb-2"
                      >
                        Urgency
                      </label>
                      <select
                        id="urgency"
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: "right 12px center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "16px",
                          paddingRight: "40px",
                        }}
                      >
                        <option value="asap">🔥 ASAP</option>
                        <option value="flexible">⏱️ Flexible</option>
                        <option value="specific">📅 Specific Time</option>
                      </select>
                    </div>
                  </div>{" "}
                  {/* Specific Time Input (if urgency is 'specific') */}
                  {formData.urgency === "specific" && (
                    <div>
                      <label
                        htmlFor="specificTime"
                        className="block text-white/90 font-medium mb-2"
                      >
                        Specific Time:
                      </label>
                      <input
                        type="text"
                        id="specificTime"
                        name="specificTime"
                        value={formData.specificTime}
                        onChange={handleInputChange}
                        placeholder="e.g., Tomorrow at 3 PM EST"
                        className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  )}
                  {/* Preferred Middleman */}
                  <div>
                    <label
                      htmlFor="preferredMiddleman"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Preferred Middleman:
                    </label>
                    <select
                      id="preferredMiddleman"
                      name="preferredMiddleman"
                      value={formData.preferredMiddleman}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 12px center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "16px",
                        paddingRight: "40px",
                      }}
                    >
                      {MIDDLEMEN.map((middleman) => (
                        <option key={middleman} value={middleman}>
                          {middleman}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Negotiable */}
                  <div className="flex items-center">
                    <input
                      id="negotiable"
                      name="negotiable"
                      type="checkbox"
                      checked={formData.negotiable}
                      onChange={handleCheckboxChange}
                      className="w-4 h-4 accent-primary-500 mr-2"
                    />
                    <label htmlFor="negotiable" className="text-white/90">
                      Price is negotiable
                    </label>
                  </div>
                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !!timeRemaining}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="sm" className="mr-2" />{" "}
                        Submitting...
                      </span>
                    ) : (
                      "Request Middleman"
                    )}
                  </Button>
                  {/* Feedback */}
                  {statusMessage.type && (
                    <div
                      className={`p-4 rounded-lg ${
                        statusMessage.type === "success"
                          ? "bg-green-500/10 border border-green-500/30 text-green-400"
                          : statusMessage.type === "error"
                          ? "bg-red-500/10 border border-red-500/30 text-red-400"
                          : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
                      }`}
                    >
                      {statusMessage.message}
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Request History */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm">
                  2
                </span>
                Your Recent Requests
              </h2>

              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : requestHistory.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <p>You haven't made any middleman requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requestHistory.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-6"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-white text-lg">
                          {req.item_name}
                        </h3>
                        <RequestStatusBadge status={req.status} />
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="font-medium text-white/60">
                            Price:
                          </span>
                          <span className="ml-2 text-white">{req.price}</span>
                          {req.negotiable && (
                            <span className="ml-1 text-green-400">
                              💰 Negotiable
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-white/60">
                            Role:
                          </span>
                          <span className="ml-2 text-white">
                            {req.trade_role === "buyer"
                              ? "🛒 Buyer"
                              : "💰 Seller"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-white/60">
                            Urgency:
                          </span>
                          <span className="ml-2 text-white">
                            {req.urgency === "asap"
                              ? "🔥 ASAP"
                              : req.urgency === "flexible"
                              ? "⏱️ Flexible"
                              : `📅 ${req.specific_time}`}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-white/60">
                            Preferred MM:
                          </span>
                          <span className="ml-2 text-white">
                            {req.preferred_middleman}
                          </span>
                        </div>
                      </div>

                      {/* Additional Details */}
                      {req.trade_details && (
                        <div className="mb-4">
                          <span className="font-medium text-white/60">
                            Details:
                          </span>
                          <p className="mt-1 text-sm text-white/80">
                            {req.trade_details}
                          </p>
                        </div>
                      )}

                      {/* Claimed By */}
                      {req.claimed_by && (
                        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                          <span className="text-sm font-medium text-orange-300">
                            📩 Claimed by:{" "}
                            <code className="bg-black/20 px-1 py-0.5 rounded text-xs">
                              {claimedByNames[req.claimed_by] || req.claimed_by}
                            </code>
                          </span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex justify-between items-center pt-4 border-t border-white/10">
                        <div className="text-sm text-white/50">
                          <p>
                            Created{" "}
                            {new Date(req.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                          <p className="text-xs">
                            Requested by: {req.in_game_name} /{" "}
                            {getUsername(user)} / {req.user_discord_id}
                          </p>
                        </div>
                        {(req.status === "pending" ||
                          req.status === "claimed") && (
                          <button
                            onClick={() => cancelRequest(req.id)}
                            className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                          >
                            ❌ Cancel Request
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: How it Works, Safety Tips, Scam List */}
          <div className="space-y-6">
            {/* How it Works */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                How it Works
              </h3>
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex items-start">
                  <span className="bg-primary-500 text-black w-5 h-5 rounded-full flex items-center justify-center mr-3 text-xs mt-0.5">
                    1
                  </span>
                  <p>Submit your middleman request with trade details</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-primary-500 text-black w-5 h-5 rounded-full flex items-center justify-center mr-3 text-xs mt-0.5">
                    2
                  </span>
                  <p>A verified middleman will claim your request</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-primary-500 text-black w-5 h-5 rounded-full flex items-center justify-center mr-3 text-xs mt-0.5">
                    3
                  </span>
                  <p>The middleman facilitates the secure trade</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-primary-500 text-black w-5 h-5 rounded-full flex items-center justify-center mr-3 text-xs mt-0.5">
                    4
                  </span>
                  <p>Both parties receive their items safely</p>
                </div>
              </div>
            </div>

            {/* Safety Tips */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Safety Tips
              </h3>
              <div className="space-y-2 text-sm text-white/80">
                <p className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>Only trade with
                  verified middlemen
                </p>
                <p className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>Check the scam
                  list before trading
                </p>
                <p className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>Screenshot all
                  trade agreements
                </p>
                <p className="flex items-center">
                  <span className="text-red-400 mr-2">✗</span>Never go first
                  without a middleman
                </p>
                <p className="flex items-center">
                  <span className="text-red-400 mr-2">✗</span>Don't trust
                  players not on our list
                </p>
              </div>
            </div>

            {/* Middleman Payment Information */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                💰 Middleman Payment
              </h3>
              <div className="space-y-3 text-sm text-white/80">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-3 mt-0.5">💡</span>
                    <div>
                      <p className="font-medium text-blue-300 mb-2">Payment Structure</p>
                      <p className="leading-relaxed">
                        Middleman payment varies - each middleman can determine their own prices between <strong className="text-white">0%-10%</strong> of the sale price in cash or other compensation items.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    Payment is discussed before trade is finalized
                  </p>
                  <p className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    Can be paid in cash or agreed compensation items
                  </p>
                  <p className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    Rate ranges from 0% to 10% of total sale value
                  </p>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-300 text-xs">
                    <strong>Note:</strong> Payment terms will be clearly communicated when a middleman claims your request.
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Known Scammers Section */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Known Scammers ({scamList.length} recent)
                </h3>
                <button
                  onClick={() => setShowAllScammers(true)}
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                >
                  Show All ({allScammers.length})
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {isLoadingScamList ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : scamList.length === 0 ? (
                  <p className="text-white/60 text-sm text-center py-4">
                    No scammers reported yet
                  </p>
                ) : (
                  <>
                    {getDisplayedScammers().map((scam) => (
                      <div
                        key={scam.id}
                        className="bg-red-500/10 border border-red-500/20 rounded p-3"
                      >
                        <div className="flex justify-between items-start">
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
                          <div className="flex items-center gap-2">
                            {scam.verified && (
                              <span className="text-red-400 text-xs">
                                ✓ Verified
                              </span>
                            )}
                            <span className="text-red-300/60 text-xs">
                              {new Date(scam.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {scam.description && (
                          <p className="text-white/70 text-xs mt-1">
                            {scam.description}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Pagination for main list */}
                    {scamList.length > 5 && (
                      <div className="flex justify-center items-center gap-2 pt-2">
                        <button
                          onClick={() =>
                            setScamListPage(Math.max(0, scamListPage - 1))
                          }
                          disabled={scamListPage === 0}
                          className="px-2 py-1 text-sm text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← Prev
                        </button>
                        <span className="text-sm text-white/60">
                          Page {scamListPage + 1} of{" "}
                          {Math.ceil(scamList.length / 5)}
                        </span>
                        <button
                          onClick={() =>
                            setScamListPage(
                              Math.min(
                                Math.ceil(scamList.length / 5) - 1,
                                scamListPage + 1
                              )
                            )
                          }
                          disabled={
                            scamListPage >= Math.ceil(scamList.length / 5) - 1
                          }
                          className="px-2 py-1 text-sm text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced "Show All" Modal */}
        {showAllScammers && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">
                    All Known Scammers ({allScammers.length})
                  </h2>
                  <button
                    onClick={() => setShowAllScammers(false)}
                    className="text-white/60 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by in-game name or Discord username..."
                    value={scammerSearch}
                    onChange={(e) => handleScammerSearch(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40">
                    🔍
                  </span>
                </div>

                {scammerSearch && (
                  <p className="text-sm text-white/60 mt-2">
                    Found {filteredScammers.length} scammer(s) matching "
                    {scammerSearch}"
                  </p>
                )}
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {filteredScammers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/60">
                      {scammerSearch
                        ? "No scammers found matching your search."
                        : "No scammers reported yet."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredScammers.map((scam) => (
                      <div
                        key={scam.id}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-red-400 font-medium text-lg">
                              {scam.in_game_name}
                            </p>
                            {scam.discord_name && (
                              <p className="text-red-300/80 text-sm">
                                Discord: {scam.discord_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {scam.verified && (
                              <span className="text-red-400 text-sm font-medium">
                                ✓ Verified
                              </span>
                            )}
                            <span className="text-red-300/60 text-xs">
                              {new Date(scam.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                        {scam.description && (
                          <div className="mt-2">
                            <p className="text-white/50 text-xs font-medium mb-1">
                              Description:
                            </p>
                            <p className="text-white/70 text-sm leading-relaxed">
                              {scam.description}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex justify-between items-center text-sm text-white/60">
                  <span>
                    Showing {filteredScammers.length} of {allScammers.length}{" "}
                    scammers
                  </span>
                  <button
                    onClick={() => setShowAllScammers(false)}
                    className="px-4 py-2 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
