"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { createClient } from "@/lib/supabase/client";
import { getDiscordId } from "@/lib/utils";
import { withTimeout } from "@/lib/timeout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

interface UserData {
  hub_trial: boolean;
  revoked: boolean;
  trial_expiration: string | null;
}

export default function WhitelistPage() {
  usePageTracking();
  
  // Use centralized auth state like other pages
  const { user, loading, hasAccess, isTrialActive, signInWithDiscord } = useAuth();
  const supabase = createClient();

  // Form state
  const [ign, setIgn] = useState("");
  const [referral, setReferral] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info" | "warning" | null;
    message: string;
  }>({ type: null, message: "" });

  // User status state - simplified
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Load additional user data only when needed for countdown timer
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || loading) return;

      setIsDataLoading(true);

      try {
        const discordId = getDiscordId(user);
        if (!discordId) {
          setIsDataLoading(false);
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
          setIsDataLoading(false);
          return;
        }

        setUserData(
          data || { hub_trial: false, revoked: true, trial_expiration: null }
        );
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchUserData();
  }, [user, loading, supabase]);

  // Determine user status based on centralized auth state
  useEffect(() => {
    if (loading) return; // Wait for auth to finish loading

    if (!user) {
      setUserStatus({
        type: "not_logged_in",
        showForm: false,
        showCountdown: false,
      });
      return;
    }

    // Use the centralized hasAccess and isTrialActive from useAuth
    if (hasAccess && isTrialActive) {
      setUserStatus({
        type: "whitelisted_trial",
        showForm: false,
        showCountdown: true,
      });
    } else if (hasAccess) {
      setUserStatus({
        type: "whitelisted",
        showForm: false,
        showCountdown: false,
      });
    } else if (userData?.hub_trial && isTrialActive) {
      setUserStatus({
        type: "active_trial",
        showForm: false,
        showCountdown: true,
      });
    } else if (userData?.hub_trial) {
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
  }, [user, loading, hasAccess, isTrialActive, userData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ign.trim()) {
      setStatusMessage({
        type: "error",
        message: "❌ Please enter your in-game name.",
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
    setStatusMessage({ type: "info", message: "Submitting your request..." });

    try {
      const discordId = getDiscordId(user);
      const discordUsername =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "Discord User";

      if (!discordId) {
        throw new Error("Could not determine Discord ID");
      }

      // Calculate trial end time (7 days from now in Unix timestamp)
      const trialEnds = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      const { data: sessionData } = await withTimeout(
        supabase.auth.getSession()
      );
      const token = sessionData.session?.access_token;

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
              ign,
              referral: referral.trim() || "None",
              trialEnds,
            }),
          }
        )
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to activate trial");
      }

      setStatusMessage({
        type: "success",
        message: "✅ Trial activated! You now have 72 hours of premium access.",
      });
      setIgn("");
      setReferral("");

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error submitting whitelist request:", error);
      setStatusMessage({
        type: "error",
        message:
          error instanceof Error
            ? `❌ ${error.message}`
            : "❌ An unexpected error occurred. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="text-xl sm:text-2xl font-bold mb-2 break-words">{timeLeft}</div>
      </div>
    );
  };

  // Status message based on user status
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
      >
        <div className="text-base sm:text-lg font-semibold break-words">{message}</div>
      </div>
    );
  };

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#ffd700]"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-[#ffd700]/30"></div>
        </div>
      </div>
    );
  }

  return (
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
                alt="Crown Icon"
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
            Join the elite community with premium features and exclusive benefits
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
                      "This is a one-time purchase that unlocks all features and allows access to all future updates"
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3 sm:gap-4 group">
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
                        <div className={`break-words ${DISCOUNT_ENABLED ? "line-through opacity-60 text-xl sm:text-2xl" : ""}`}>
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
                      Upon form submission, you will be granted a <strong className="text-blue-300">7-day trial</strong> to enjoy the features while we process your request.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-2xl p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#ffd700] mb-2 flex items-center justify-center gap-3 flex-wrap">
                    <span className="text-3xl sm:text-4xl animate-bounce">🚀</span>
                    <span>Start Your Journey</span>
                  </h3>
                  <p className="text-white/80 text-base sm:text-lg break-words">Ready to join the elite? Let's get started!</p>
                </div>

                {userStatus && (
                  <div className="mb-6 sm:mb-8">
                    <StatusMessage status={userStatus} />

                    {userStatus.showCountdown && userData?.trial_expiration && (
                      <CountdownTimer expirationTime={userData.trial_expiration} />
                    )}
                  </div>
                )}

                {userStatus?.type === "not_logged_in" ? (
                  <div className="text-center">
                    <button
                      onClick={signInWithDiscord}
                      className="group relative inline-flex items-center justify-center gap-3 py-4 sm:py-6 px-6 sm:px-12 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-lg sm:text-xl rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl w-full sm:w-auto"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 71 55"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="group-hover:animate-pulse flex-shrink-0"
                      >
                        <path
                          d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"
                          fill="currentColor"
                        />
                      </svg>
                      <span className="break-words">Connect with Discord</span>
                    </button>
                  </div>
                ) : userStatus?.showForm ? (
                  <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                    <div>
                      <label htmlFor="ign" className="block text-white/90 font-semibold text-base sm:text-lg mb-3">
                        🎮 In-Game Name
                      </label>
                      <input
                        type="text"
                        id="ign"
                        value={ign}
                        onChange={(e) => setIgn(e.target.value)}
                        placeholder="Enter your IGN"
                        required
                        className="w-full p-4 sm:p-5 rounded-xl border-2 border-white/20 bg-black/40 text-white text-base sm:text-lg backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-4 focus:ring-[#ffd700]/20 transition-all duration-300 placeholder-white/50"
                      />
                    </div>

                    <div>
                      <label htmlFor="referral" className="block text-white/90 font-semibold text-base sm:text-lg mb-3">
                        👥 Referred By <span className="text-white/60 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id="referral"
                        value={referral}
                        onChange={(e) => setReferral(e.target.value)}
                        placeholder="IGN of who referred you?"
                        className="w-full p-4 sm:p-5 rounded-xl border-2 border-white/20 bg-black/40 text-white text-base sm:text-lg backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-4 focus:ring-[#ffd700]/20 transition-all duration-300 placeholder-white/50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group relative w-full py-4 sm:py-6 px-6 sm:px-8 bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] text-black font-black text-lg sm:text-xl uppercase tracking-wider rounded-2xl shadow-2xl hover:shadow-[#ffd700]/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
                      <span className="relative z-10 flex items-center justify-center gap-3 flex-wrap">
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-t-2 border-b-2 border-black"></div>
                            <span>Activating Trial...</span>
                          </>
                        ) : (
                          <>
                            <span>🚀</span>
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
                      >
                        <div className="break-words">{statusMessage.message}</div>
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    {userStatus?.type === "whitelisted" && (
                      <div className="space-y-4">
                        <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#ffd700] mb-2">
                          Welcome to A-List Plus!
                        </h3>
                        <p className="text-white/90 text-base sm:text-lg break-words">
                          You already have full access to all premium features. Enjoy your exclusive experience!
                        </p>
                      </div>
                    )}

                    {userStatus?.type === "whitelisted_trial" && (
                      <div className="space-y-4">
                        <div className="text-5xl sm:text-6xl mb-4">⏳</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#ffd700] mb-2">
                          Trial Active!
                        </h3>
                        <p className="text-white/90 text-base sm:text-lg break-words">
                          You have full access during your trial period. A staff member will contact you soon to complete your purchase.
                        </p>
                      </div>
                    )}

                    {userStatus?.type === "active_trial" && (
                      <div className="space-y-4">
                        <div className="text-5xl sm:text-6xl mb-4">⏳</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#ffd700] mb-2">
                          Trial in Progress
                        </h3>
                        <p className="text-white/90 text-base sm:text-lg break-words">
                          Your trial is currently active. A staff member will contact you soon to complete your purchase.
                        </p>
                      </div>
                    )}

                    {userStatus?.type === "expired_trial" && (
                      <div className="space-y-4">
                        <div className="text-5xl sm:text-6xl mb-4">⏰</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">
                          Trial Expired
                        </h3>
                        <p className="text-white/90 text-base sm:text-lg break-words">
                          Your trial has expired. Please contact a staff member to complete your purchase and regain access.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom CTA */}
              <div className="text-center mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10">
                <p className="text-[#ffd700] font-bold text-xl sm:text-2xl mb-4 break-words">
                  🌟 Ready to Join the Elite? 🌟
                </p>
                <p className="text-white/80 text-base sm:text-lg break-words">
                  Experience the exclusive A-List Plus lifestyle today!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-12 text-center text-white/60 px-4">
          <p className="text-xs sm:text-sm break-words">
            © 2024 A-List Hub. All rights reserved. | 
            <span className="text-[#ffd700] ml-1">Elite Gaming Experience</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
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
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.1;
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
          button, input, select {
            min-height: 44px;
          }
          
          /* Prevent iOS zoom on form focus */
          input, textarea, select {
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
      `}</style>
    </div>
  );
}