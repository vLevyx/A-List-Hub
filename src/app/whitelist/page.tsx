"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { createClient } from "@/lib/supabase/client";
import { getDiscordId } from "@/lib/utils";
import { withTimeout } from "@/lib/timeout";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { ReferralSelector } from "@/components/ui/ReferralSelector";

// Configuration
const DISCOUNT_ENABLED = false;
const ORIGINAL_PRICE = 2500000;
const DISCOUNT_RATE = 0.15;
const DISCOUNTED_PRICE = ORIGINAL_PRICE * (1 - DISCOUNT_RATE);

interface UserStatus {
  type:
    | "whitelisted_trial"
    | "whitelisted"
    | "active_trial"
    | "expired_trial"
    | "eligible"
    | "not_logged_in";
  showForm: boolean;
  showCountdown: boolean;
}

// Referral milestone data
const REFERRAL_MILESTONES = [
  { count: 3, reward: "ELAN$750,000", type: "bonus" },
  { count: 5, reward: "ELAN$1,500,000", type: "bonus" },
  { count: 10, reward: "Early-Beta Access", type: "feature" },
  { count: 15, reward: "ELAN$10,000,000", type: "bonus" },
  { count: 20, reward: "ELAN$500,000 per referral", type: "ongoing" },
];

export default function WhitelistPage() {
  const { user, loading, signInWithDiscord } = useAuth();
  const supabase = createClient();

  usePageTracking();

  // Form state
  const [ign, setIgn] = useState("");
  const [referral, setReferral] = useState("");
  const [referralDiscordId, setReferralDiscordId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info" | "warning" | null;
    message: string;
  }>({ type: null, message: "" });

  // User status state
  const [userData, setUserData] = useState<any>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Referral modal state
  const [showReferralModal, setShowReferralModal] = useState(false);

  const fetchUserData = async () => {
  setIsLoading(true);

  if (!user) {
    setUserStatus({
      type: "not_logged_in",
      showForm: false,
      showCountdown: false,
    });
    setIsLoading(false);
    return;
  }

  try {
    const discordId = getDiscordId(user);
    if (!discordId) {
      // Only show error if authentication is complete
      if (!loading) {
        setStatusMessage({
          type: "error",
          message: "Could not determine Discord ID",
        });
      }
      setIsLoading(false);
      return;
    }

    const { data, error } = await withTimeout(
      supabase
        .from("users")
        .select("hub_trial, revoked, trial_expiration")
        .eq("discord_id", discordId)
        .single()
    );

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user data:", error);
      setIsLoading(false);
      return;
    }

    setUserData(
      data || { hub_trial: false, revoked: true, trial_expiration: null }
    );
    setIsLoading(false);
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    setIsLoading(false);
  } finally {
    setIsLoading(false);
  }
};

// Also update your useEffect that calls fetchUserData:
useEffect(() => {
  // Only fetch user data if user exists AND loading is complete
  if (user && !loading) {
    fetchUserData();
  } else if (!user && !loading) {
    // User is confirmed to not be logged in
    setUserStatus({
      type: "not_logged_in",
      showForm: false,
      showCountdown: false,
    });
    setIsLoading(false);
  }
}, [user, loading, supabase]);

  // Determine user status
  useEffect(() => {
    if (!user) {
      setUserStatus({
        type: "not_logged_in",
        showForm: false,
        showCountdown: false,
      });
      return;
    }

    if (userData) {
      const now = new Date();
      const isTrialActive =
        userData.trial_expiration && new Date(userData.trial_expiration) > now;

      if (userData.revoked === false && isTrialActive) {
        setUserStatus({
          type: "whitelisted_trial",
          showForm: false,
          showCountdown: true,
        });
      } else if (userData.revoked === false) {
        setUserStatus({
          type: "whitelisted",
          showForm: false,
          showCountdown: false,
        });
      } else if (userData.hub_trial && isTrialActive) {
        setUserStatus({
          type: "active_trial",
          showForm: false,
          showCountdown: true,
        });
      } else if (userData.hub_trial) {
        setUserStatus({
          type: "expired_trial",
          showForm: false,
          showCountdown: false,
        });
      } else {
        setUserStatus({
          type: "eligible",
          showForm: true,
          showCountdown: false,
        });
      }
    }
  }, [userData, user]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      setStatusMessage({ type: null, message: "" });

      if (!ign.trim()) {
        setStatusMessage({
          type: "error",
          message: "❌ Please enter your in-game name.",
        });
        const ignInput = document.getElementById("ign") as HTMLInputElement;
        if (ignInput) {
          ignInput.focus();
        }
        return;
      }

      if (ign.trim().length < 2) {
        setStatusMessage({
          type: "error",
          message: "❌ In-game name must be at least 2 characters long.",
        });
        return;
      }

      if (!user) {
        setStatusMessage({
          type: "error",
          message: "❌ You must be logged in to request a trial.",
        });
        return;
      }

      setIsSubmitting(true);
      setStatusMessage({
        type: "info",
        message: "🔄 Submitting your request...",
      });

      try {
        const discordId = getDiscordId(user);
        const discordUsername =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "Discord User";

        if (!discordId) {
          throw new Error("Could not determine Discord ID");
        }

        const trialEnds = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

        const { data: sessionData } = await withTimeout(
          supabase.auth.getSession(),
          10000
        );
        const token = sessionData.session?.access_token;

        if (!token) {
          throw new Error(
            "Authentication token not found. Please log in again."
          );
        }

        const response = await withTimeout(
          fetch(
            "https://dsexkdjxmhgqahrlkvax.functions.supabase.co/sendDiscordWebhook",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                discordId,
                discordUsername,
                ign: ign.trim(),
                referral: referral.trim() || "None",
                referralDiscordId: referralDiscordId || null, // Include the discord_id for tracking
                trialEnds,
              }),
            }
          ),
          15000
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        }

        setStatusMessage({
          type: "success",
          message: "✅ Trial activated! You now have 7 days of premium access.",
        });

        setIgn("");
        setReferral("");
        setReferralDiscordId("");

        setTimeout(() => {
          window.location.reload();
        }, 2500);
      } catch (error) {
        console.error("Error submitting whitelist request:", error);

        let errorMessage =
          "❌ An unexpected error occurred. Please try again later.";

        if (error instanceof Error) {
          if (error.message.includes("timeout")) {
            errorMessage =
              "❌ Request timeout. Please check your connection and try again.";
          } else if (error.message.includes("Discord ID")) {
            errorMessage =
              "❌ Authentication error. Please log out and log in again.";
          } else {
            errorMessage = `❌ ${error.message}`;
          }
        }

        setStatusMessage({
          type: "error",
          message: errorMessage,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [ign, referral, referralDiscordId, user, supabase] // Add referralDiscordId to dependencies
  );

  const handleIgnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setIgn(value);

      if (statusMessage.type === "error" && value.trim()) {
        setStatusMessage({ type: null, message: "" });
      }
    },
    [statusMessage.type]
  );

  const handleReferralChange = useCallback(
    (value: string, discordId?: string) => {
      setReferral(value);
      setReferralDiscordId(discordId || "");
    },
    []
  );

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showReferralModal) {
        setShowReferralModal(false);
      }
    };

    if (showReferralModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showReferralModal]);

  // Countdown timer component
  const CountdownTimer = ({ expirationTime }: { expirationTime: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
      const expiration = new Date(expirationTime);

      const updateCountdown = () => {
        const now = new Date();
        const diff = expiration.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft("⏰ Your trial has expired.");
          return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let display = "⏳ Trial ends in: ";
        if (days > 0) display += `${days}d `;
        if (hours > 0 || days > 0) display += `${hours}h `;
        display += `${minutes}m ${seconds}s`;

        setTimeLeft(display);
      };

      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);

      return () => clearInterval(timer);
    }, [expirationTime]);

    return (
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-sm text-blue-300 p-4 sm:p-6 rounded-2xl text-center my-6 animate-pulse-soft">
        <div className="text-xl sm:text-2xl font-bold mb-2 break-words">
          {timeLeft}
        </div>
      </div>
    );
  };

  // Status message component
  const StatusMessage = ({ status }: { status: UserStatus }) => {
    const messages = {
      whitelisted_trial: {
        message: "✅ You are currently whitelisted (active trial).",
        type: "success" as const,
      },
      whitelisted: {
        message: "✅ You are currently whitelisted.",
        type: "success" as const,
      },
      active_trial: {
        message: "⏳ You have an active trial running.",
        type: "warning" as const,
      },
      expired_trial: {
        message:
          "❌ Your trial has expired. You have already used your one-time trial.",
        type: "error" as const,
      },
      eligible: { message: "", type: null },
      not_logged_in: {
        message: "⚠️ Please log in with Discord to request a trial.",
        type: "warning" as const,
      },
    };

    const { message, type } = messages[status.type];

    if (!message) return null;

    return (
      <div
        className={`p-4 sm:p-6 rounded-2xl text-center backdrop-blur-sm border-2 ${
          type === "success"
            ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-300"
            : type === "warning"
            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40 text-yellow-300"
            : "bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/40 text-red-300"
        }`}
        role="alert"
        aria-live="polite"
      >
        <div className="text-base sm:text-lg font-semibold break-words">
          {message}
        </div>
      </div>
    );
  };

  // Referral Modal Component
  const ReferralModal = () => {
    if (!showReferralModal) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 animate-fade-in"
        onClick={() => setShowReferralModal(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-modal-title"
      >
        <div
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e] border border-[#ffd700]/30 rounded-3xl shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowReferralModal(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-[#ffd700]"
            aria-label="Close referral program modal"
          >
            <svg
              className="w-5 h-5 text-white/70 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-white/10">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4 animate-bounce">🤝</div>
              <h2
                id="referral-modal-title"
                className="text-3xl sm:text-4xl font-black mb-4 bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffc400] bg-clip-text text-transparent"
              >
                A-List Hub Referral Program
              </h2>
              <p className="text-white/80 text-lg sm:text-xl">
                Help the community grow — and get paid for it.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* How It Works */}
            <section>
              <h3 className="text-2xl font-bold text-[#ffd700] mb-4 flex items-center gap-3">
                <span className="text-3xl">🔄</span>
                How It Works
              </h3>
              <div className="bg-gradient-to-r from-[#ffd700]/10 to-purple-500/10 border border-[#ffd700]/30 rounded-2xl p-6">
                <p className="text-white/90 text-lg leading-relaxed mb-4">
                  Refer someone to the{" "}
                  <strong className="text-[#ffd700]">A-List Hub</strong>, and
                  you'll earn{" "}
                  <strong className="text-green-400">
                    10% of the current sale price
                  </strong>{" "}
                  once they purchase{" "}
                  <strong className="text-[#ffd700]">
                    premium lifetime features
                  </strong>
                  .
                </p>
                <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                  <p className="text-white/70 text-sm mb-2">Example:</p>
                  <div className="space-y-1">
                    <p className="text-white">
                      Premium Price:{" "}
                      <span className="text-[#ffd700] font-bold">
                        ELAN$2,500,000
                      </span>
                    </p>
                    <p className="text-white">
                      You Receive:{" "}
                      <span className="text-green-400 font-bold">
                        ELAN$250,000
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section>
              <h3 className="text-2xl font-bold text-[#ffd700] mb-4 flex items-center gap-3">
                <span className="text-3xl">✅</span>
                No Limits. No Expiration.
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-300 font-semibold mb-2">
                    During Trial
                  </p>
                  <p className="text-white/80 text-sm">
                    Get rewarded when they purchase during their trial period
                  </p>
                </div>
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-300 font-semibold mb-2">
                    After Trial
                  </p>
                  <p className="text-white/80 text-sm">
                    Still get rewarded even if they purchase later
                  </p>
                </div>
              </div>
            </section>

            {/* How to Claim */}
            <section>
              <h3 className="text-2xl font-bold text-[#ffd700] mb-4 flex items-center gap-3">
                <span className="text-3xl">📝</span>
                How to Claim Your Reward
              </h3>
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
                <p className="text-white/90 text-lg leading-relaxed">
                  To help the A-List Hub Staff track referrals smoothly,{" "}
                  <strong className="text-blue-300">
                    have your referral enter your Discord username in the "Referred By"
                    section
                  </strong>{" "}
                  of the{" "}
                  <strong className="text-[#ffd700]">
                    whitelist request form
                  </strong>{" "}
                  when starting their trial.
                </p>
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-300 font-semibold text-sm">
                    ⚠️ This step is crucial to ensure you're credited properly.
                  </p>
                </div>
              </div>
            </section>

            {/* Share Link Section */}
            <section>
              <h3 className="text-2xl font-bold text-[#ffd700] mb-4 flex items-center gap-3">
                <span className="text-3xl">🔗</span>
                Share A-List Hub
              </h3>
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6">
                <p className="text-white/90 text-lg leading-relaxed mb-6">
                  Share the A-List Hub whitelist page with your friends and
                  start earning rewards through our referral program!
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <CopyLinkButton />

                  <div className="text-white/70 text-sm">
                    <p className="font-semibold text-emerald-300 mb-1">
                      💡 Pro Tip:
                    </p>
                    <p>
                      Share this link anywhere - Discord, social media, or
                      directly with friends!
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Milestones */}
            <section>
              <h3 className="text-2xl font-bold text-[#ffd700] mb-6 flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                Referral Milestones
              </h3>
              <div className="space-y-4">
                {REFERRAL_MILESTONES.map((milestone, index) => (
                  <div
                    key={index}
                    className={`relative p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                      milestone.type === "feature"
                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40"
                        : milestone.type === "ongoing"
                        ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40"
                        : "bg-gradient-to-r from-[#ffd700]/20 to-orange-500/20 border-[#ffd700]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            milestone.type === "feature"
                              ? "bg-purple-500 text-white"
                              : milestone.type === "ongoing"
                              ? "bg-green-500 text-white"
                              : "bg-[#ffd700] text-black"
                          }`}
                        >
                          {milestone.count}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {milestone.count} Referrals
                          </p>
                          <p
                            className={`font-bold text-xl ${
                              milestone.type === "feature"
                                ? "text-purple-300"
                                : milestone.type === "ongoing"
                                ? "text-green-300"
                                : "text-[#ffd700]"
                            }`}
                          >
                            {milestone.reward}
                          </p>
                        </div>
                      </div>
                      {milestone.type === "ongoing" && (
                        <div className="bg-green-500/20 px-3 py-1 rounded-full">
                          <span className="text-green-300 text-sm font-semibold">
                            Ongoing
                          </span>
                        </div>
                      )}
                      {milestone.type === "feature" && (
                        <div className="bg-purple-500/20 px-3 py-1 rounded-full">
                          <span className="text-purple-300 text-sm font-semibold">
                            Special
                          </span>
                        </div>
                      )}
                    </div>

                    {milestone.type === "ongoing" && (
                      <div className="mt-3 text-green-300/80 text-sm">
                        Every verified referral after 20 earns you ELAN$500,000!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Call to Action */}
            <section className="text-center">
              <div className="bg-gradient-to-r from-[#ffd700]/20 to-orange-500/20 border border-[#ffd700]/40 rounded-2xl p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-[#ffd700] mb-4">
                  Ready to Start Earning?
                </h3>
                <p className="text-white/90 text-lg mb-6 leading-relaxed">
                  Share your IGN with friends and start earning rewards when
                  they join the A-List Hub community!
                </p>
                <button
                  onClick={() => setShowReferralModal(false)}
                  className="group relative py-3 px-8 bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] text-black font-bold text-lg rounded-2xl shadow-lg hover:shadow-[#ffd700]/25 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#ffd700]/30"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span>🚀</span>
                    <span>Get Started</span>
                  </span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if ((loading || isLoading) && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e]">
        <div className="relative" role="status" aria-label="Loading">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#ffd700]"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-[#ffd700]/30"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e] bg-fixed relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 bg-[#ffd700]/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/3 rounded-full blur-3xl animate-pulse-slow"></div>
        </div>

        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen flex flex-col justify-center items-center relative z-10">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in-up">
            <div className="relative inline-block mb-6 sm:mb-8">
              <div className="absolute inset-0 bg-[#ffd700]/20 rounded-full blur-2xl animate-pulse-soft scale-150"></div>
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto">
                <Image
                  src="https://icons.iconarchive.com/icons/microsoft/fluentui-emoji-3d/512/Crown-3d-icon.png"
                  alt="Crown Icon representing premium access"
                  width={96}
                  height={96}
                  className="relative z-10 drop-shadow-2xl w-full h-full"
                  priority
                />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-4 bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffc400] bg-clip-text text-transparent leading-tight">
              A-List Plus
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
              Exclusive Premium Access
            </h2>
            <p className="text-white/70 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
              Join the elite community with premium features and exclusive
              benefits
            </p>
          </div>

          {/* Main Card */}
          <div className="w-full max-w-4xl bg-black/40 backdrop-blur-2xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up-delayed">
            {/* Gradient border effect */}
            <div className="relative p-1 bg-gradient-to-r from-[#ffd700] via-purple-500 to-blue-500 rounded-3xl">
              <div className="bg-black/80 backdrop-blur-xl rounded-[22px] p-4 sm:p-6 md:p-8 lg:p-12">
                {/* Benefits Section - Mobile Optimized */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
                  <div className="space-y-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#ffd700] mb-4 sm:mb-6 flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl">⚡</span>
                      What You Get
                    </h3>

                    <div className="space-y-4 sm:space-y-6">
                      {[
                        "Complete the form below to start your premium trial experience",
                        "Once form is submitted, one of the A-List Hub staff members will be in touch with you via Discord DMs",
                        "This is a one-time purchase that unlocks all features and allows access to all future updates",
                      ].map((benefit, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 sm:gap-4 group"
                        >
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-[#ffd700] to-[#ffc400] rounded-full flex items-center justify-center text-black font-bold text-sm group-hover:scale-110 transition-transform">
                            {index + 1}
                          </div>
                          <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed group-hover:text-white transition-colors break-words">
                            {benefit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {/* Pricing Card - Mobile Optimized */}
                    <div className="bg-gradient-to-br from-[#ffd700]/10 to-purple-500/10 border border-[#ffd700]/30 rounded-2xl p-4 sm:p-6 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                      <div className="relative z-10">
                        <h4 className="text-[#ffd700] text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                          💎 Premium Price
                        </h4>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">
                          <div
                            className={`break-words ${
                              DISCOUNT_ENABLED
                                ? "line-through opacity-60 text-xl sm:text-2xl"
                                : ""
                            }`}
                          >
                            ELAN${ORIGINAL_PRICE.toLocaleString()}
                          </div>
                          {DISCOUNT_ENABLED && (
                            <div className="text-[#ffd700] mt-2">
                              <div className="break-words">
                                E${DISCOUNTED_PRICE.toLocaleString()}
                              </div>
                              <span className="inline-block bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1 rounded-full mt-2 animate-bounce">
                                15% OFF
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Trial Bonus - Mobile Optimized */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-4 sm:p-6 text-center">
                      <h4 className="text-blue-300 text-lg sm:text-xl font-semibold mb-3 flex items-center justify-center gap-2 flex-wrap">
                        <span>🎁</span>
                        <span>FREE Trial Included</span>
                      </h4>
                      <p className="text-white/90 text-sm sm:text-base leading-relaxed break-words">
                        Upon form submission, you will be granted a{" "}
                        <strong className="text-blue-300">7-day trial</strong>{" "}
                        to enjoy the features while we process your request.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Section */}
                <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-2xl p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
                  <div className="text-center mb-6 sm:mb-8">
                    <h3 className="text-2xl sm:text-3xl font-bold text-[#ffd700] mb-2 flex items-center justify-center gap-3 flex-wrap">
                      <span className="text-3xl sm:text-4xl animate-bounce">
                        🚀
                      </span>
                      <span>Start Your Journey</span>
                    </h3>
                    <p className="text-white/80 text-base sm:text-lg break-words">
                      Ready to join the elite? Let's get started!
                    </p>
                  </div>

                  {userStatus && (
                    <div className="mb-6 sm:mb-8">
                      <StatusMessage status={userStatus} />

                      {userStatus.showCountdown &&
                        userData?.trial_expiration && (
                          <CountdownTimer
                            expirationTime={userData.trial_expiration}
                          />
                        )}
                    </div>
                  )}

                  {userStatus?.type === "not_logged_in" ? (
                    <div className="text-center">
                      <button
                        onClick={signInWithDiscord}
                        className="group relative inline-flex items-center justify-center gap-3 py-4 sm:py-6 px-6 sm:px-12 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-lg sm:text-xl rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-[#5865F2]/20"
                        aria-label="Sign in with Discord to access premium features"
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 71 55"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="group-hover:animate-pulse flex-shrink-0"
                          aria-hidden="true"
                        >
                          <path
                            d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="break-words">
                          Connect with Discord
                        </span>
                      </button>
                    </div>
                  ) : userStatus?.showForm ? (
                    <form
                      onSubmit={handleSubmit}
                      className="space-y-6 sm:space-y-8"
                      noValidate
                    >
                      <div>
                        <label
                          htmlFor="ign"
                          className="block text-white/90 font-semibold text-base sm:text-lg mb-3"
                        >
                          🎮 In-Game Name{" "}
                          <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          id="ign"
                          name="ign"
                          value={ign}
                          onChange={handleIgnChange}
                          placeholder="Enter your in-game name"
                          required
                          minLength={2}
                          maxLength={50}
                          autoComplete="username"
                          aria-describedby="ign-error"
                          aria-invalid={
                            statusMessage.type === "error" &&
                            statusMessage.message.includes("in-game name")
                          }
                          className="w-full p-4 sm:p-5 rounded-xl border-2 border-white/20 bg-black/40 text-white text-base sm:text-lg backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-4 focus:ring-[#ffd700]/20 transition-all duration-300 placeholder-white/50 invalid:border-red-500/50"
                        />
                        {statusMessage.type === "error" &&
                          statusMessage.message.includes("in-game name") && (
                            <div
                              id="ign-error"
                              className="mt-2 text-red-400 text-sm"
                              role="alert"
                            >
                              {statusMessage.message}
                            </div>
                          )}
                      </div>

                      <div>
                        <label
                          htmlFor="referral"
                          className="block text-white/90 font-semibold text-base sm:text-lg mb-3"
                        >
                          👥 Referred By{" "}
                          <span className="text-white/60 font-normal">
                            (Optional)
                          </span>
                        </label>
                        <ReferralSelector
                          value={referral}
                          onChange={handleReferralChange}
                          disabled={isSubmitting}
                          className="w-full"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !ign.trim()}
                        className="group relative w-full py-4 sm:py-6 px-6 sm:px-8 bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] text-black font-black text-lg sm:text-xl uppercase tracking-wider rounded-2xl shadow-2xl hover:shadow-[#ffd700]/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden focus:outline-none focus:ring-4 focus:ring-[#ffd700]/30"
                        aria-label={
                          isSubmitting
                            ? "Submitting trial request"
                            : "Submit trial request"
                        }
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
                        <span className="relative z-10 flex items-center justify-center gap-3 flex-wrap">
                          {isSubmitting ? (
                            <>
                              <div
                                className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-t-2 border-b-2 border-black"
                                aria-hidden="true"
                              ></div>
                              <span>Activating Trial...</span>
                            </>
                          ) : (
                            <>
                              <span aria-hidden="true">🚀</span>
                              <span>Activate Premium Trial</span>
                            </>
                          )}
                        </span>
                      </button>

                      {statusMessage.type && (
                        <div
                          className={`p-4 sm:p-6 rounded-2xl text-center text-base sm:text-lg font-semibold backdrop-blur-sm border-2 ${
                            statusMessage.type === "success"
                              ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-300"
                              : statusMessage.type === "error"
                              ? "bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/40 text-red-300"
                              : statusMessage.type === "warning"
                              ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40 text-yellow-300"
                              : "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/40 text-blue-300"
                          }`}
                          role="alert"
                          aria-live="polite"
                        >
                          <div className="break-words">
                            {statusMessage.message}
                          </div>
                        </div>
                      )}
                    </form>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      {userStatus?.type === "whitelisted" && (
                        <div className="space-y-4">
                          <div
                            className="text-5xl sm:text-6xl mb-4"
                            aria-hidden="true"
                          >
                            🎉
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold text-[#ffd700] mb-2">
                            Welcome to A-List Plus!
                          </h3>
                          <p className="text-white/90 text-base sm:text-lg break-words">
                            You already have full access to all premium
                            features. Enjoy your exclusive experience!
                          </p>
                        </div>
                      )}

                      {userStatus?.type === "whitelisted_trial" && (
                        <div className="space-y-4">
                          <div
                            className="text-5xl sm:text-6xl mb-4"
                            aria-hidden="true"
                          >
                            ⏳
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold text-[#ffd700] mb-2">
                            Trial Active!
                          </h3>
                          <p className="text-white/90 text-base sm:text-lg break-words">
                            You have full access during your trial period. A
                            staff member will contact you soon to complete your
                            purchase.
                          </p>
                        </div>
                      )}

                      {userStatus?.type === "active_trial" && (
                        <div className="space-y-4">
                          <div
                            className="text-5xl sm:text-6xl mb-4"
                            aria-hidden="true"
                          >
                            ⏳
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold text-[#ffd700] mb-2">
                            Trial in Progress
                          </h3>
                          <p className="text-white/90 text-base sm:text-lg break-words">
                            Your trial is currently active. A staff member will
                            contact you soon to complete your purchase.
                          </p>
                        </div>
                      )}

                      {userStatus?.type === "expired_trial" && (
                        <div className="space-y-4">
                          <div
                            className="text-5xl sm:text-6xl mb-4"
                            aria-hidden="true"
                          >
                            ⏰
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">
                            Trial Expired
                          </h3>
                          <p className="text-white/90 text-base sm:text-lg break-words">
                            Your trial has expired. Please contact a staff
                            member to complete your purchase and regain access.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Referral Button */}
        <button
          onClick={() => setShowReferralModal(true)}
          className="fixed bottom-6 right-6 z-40 group bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] text-black p-4 rounded-full shadow-2xl hover:shadow-[#ffd700]/50 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#ffd700]/30 animate-bounce-subtle"
          aria-label="Open referral program information"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-[#ffd700]/30 rounded-full animate-ping"></div>
            <div className="relative flex items-center gap-2">
              <span className="text-2xl group-hover:animate-pulse">🤝</span>
              <span className="hidden sm:inline font-bold text-lg">
                Referrals
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Referral Modal */}
      <ReferralModal />

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up-delayed {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-soft {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounce-subtle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animate-fade-in-up-delayed {
          animation: fade-in-up-delayed 1s ease-out 0.2s forwards;
          opacity: 0;
        }

        .animate-pulse-soft {
          animation: pulse-soft 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }

        /* Enhanced Mobile optimizations */
        @media (max-width: 640px) {
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          /* Ensure text doesn't overflow on very small screens */
          * {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
        }

        /* Tablet optimizations */
        @media (min-width: 641px) and (max-width: 1024px) {
          .container {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .bg-black\/40 {
            background-color: rgba(0, 0, 0, 0.8);
          }

          .border-white\/20 {
            border-color: rgba(255, 255, 255, 0.4);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Focus styles for accessibility */
        button:focus-visible,
        input:focus-visible {
          outline: 2px solid #ffd700;
          outline-offset: 2px;
        }

        /* Touch target optimizations for mobile */
        @media (max-width: 768px) {
          button,
          input,
          select {
            min-height: 44px;
          }

          /* Prevent iOS zoom on form focus */
          input,
          textarea,
          select {
            font-size: 16px;
          }
        }

        /* Safe area insets for mobile devices with notches */
        @supports (padding: max(0px)) {
          .container {
            padding-left: max(1rem, env(safe-area-inset-left));
            padding-right: max(1rem, env(safe-area-inset-right));
          }
        }

        /* Loading state optimization */
        .animate-spin {
          will-change: transform;
        }

        /* Performance optimizations for animations */
        .animate-float,
        .animate-float-delayed,
        .animate-pulse-soft,
        .animate-pulse-slow {
          will-change: transform, opacity;
        }

        /* Improve text rendering */
        * {
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Optimize GPU acceleration for animations */
        .animate-fade-in-up,
        .animate-fade-in-up-delayed {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }

        /* Modal scroll optimization */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 215, 0, 0.5) transparent;
        }

        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.5);
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 215, 0, 0.7);
        }
      `}</style>
    </>
  );
}
