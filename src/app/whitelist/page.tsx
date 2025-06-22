"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { createClient } from "@/lib/supabase/client";
import { getDiscordId } from "@/lib/utils";

// Configuration
const DISCOUNT_ENABLED = false;
const ORIGINAL_PRICE = 2500000;
const DISCOUNT_RATE = 0.15;
const DISCOUNTED_PRICE = ORIGINAL_PRICE * (1 - DISCOUNT_RATE);
const TRIAL_DAYS = 3;

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

export default function WhitelistPage() {
  usePageTracking();
  const { user, loading, signInWithDiscord } = useAuth();
  const supabase = createClient();

  // Form state
  const [ign, setIgn] = useState("");
  const [referral, setReferral] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info" | "warning" | null;
    message: string;
  }>({ type: null, message: "" });

  // User status state
  const [userData, setUserData] = useState<any>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
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
          setStatusMessage({
            type: "error",
            message: "Could not determine Discord ID",
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("hub_trial, revoked, trial_expiration")
          .eq("discord_id", discordId)
          .single();

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
      }
    };

    if (!loading) {
      fetchUserData();
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

      // Calculate trial end time (3 days from now in Unix timestamp)
      const trialEnds =
        Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60;

      const response = await fetch(
        "https://dsexkdjxmhgqahrlkvax.functions.supabase.co/sendDiscordWebhook",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
          },
          body: JSON.stringify({
            ign,
            discordId,
            discordUsername,
            trialEnds,
            referral: referral.trim(),
          }),
        }
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
      <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-4 rounded-lg text-center my-4">
        {timeLeft}
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
        className={`p-4 rounded-lg text-center ${
          type === "success"
            ? "bg-green-500/10 border border-green-500/30 text-green-400"
            : type === "warning"
            ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}
      >
        {message}
      </div>
    );
  };

  if ((loading || isLoading) && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c0c0c] to-[#1a1a2e]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e] bg-fixed">
      <div className="container max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-2xl bg-[rgba(18,18,18,0.95)] bg-gradient-to-b from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-white/15 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden animate-fadeIn">
          {/* Top border gradient */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ffd700]/50 to-transparent"></div>

          <div className="text-center mb-10">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd700]/40 blur-xl animate-pulse"></div>
              <Image
                src="https://icons.iconarchive.com/icons/microsoft/fluentui-emoji-3d/512/Crown-3d-icon.png"
                alt="Crown Icon"
                width={64}
                height={64}
                className="relative z-10"
              />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#ffd700] to-[#ffed4e] inline-block text-transparent bg-clip-text">
              Request A-List Plus Whitelist
            </h1>
            <p className="text-white/80 text-lg">Exclusive Premium Access</p>
          </div>

          <div className="mb-10">
            <ul className="space-y-4 mb-8">
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">
                  ✦
                </span>
                Complete the form below to start your premium trial experience
              </li>
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">
                  ✦
                </span>
                Purchase price is
                <span
                  className={`text-[#ffd700] font-semibold text-xl ${
                    DISCOUNT_ENABLED ? "line-through opacity-60" : ""
                  }`}
                >
                  {" "}
                  ELAN${ORIGINAL_PRICE.toLocaleString()}
                </span>
                {DISCOUNT_ENABLED && (
                  <>
                    <span className="text-[#ffd700] font-semibold text-xl ml-2">
                      → E${DISCOUNTED_PRICE.toLocaleString()}
                    </span>
                    <span className="inline-block bg-gradient-to-r from-[#ffd900]/30 to-[#ffc400]/50 text-white text-xs font-semibold px-2 py-1 rounded-lg border-1.5 border-[#ffd900]/50 ml-2 align-middle">
                      15% OFF
                    </span>
                  </>
                )}
              </li>
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">
                  ✦
                </span>
                Once form is submitted, one of the A-List Hub staff members will
                be in touch with you via Discord DMs to receive payment and
                complete your whitelist request
              </li>
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">
                  ✦
                </span>
                This is a one-time purchase that unlocks all features and allows
                access to all future updates
              </li>
            </ul>

            <div className="bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-xl p-6 text-center">
              <h3 className="text-[#ffd700] text-xl font-semibold mb-2">
                🎁 Complimentary Trial Access
              </h3>
              <p className="text-white/90">
                Upon form submission, you will be granted a{" "}
                <strong>3-day trial</strong> to enjoy the features and explore
                on your own while we process your request.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-[#ffd700]/30 to-transparent my-8"></div>

            <div className="bg-white/5 border border-[#ffd700]/20 rounded-xl p-6 md:p-8">
              <h2 className="text-xl font-semibold text-[#ffd700] text-center flex items-center justify-center gap-2 mb-6">
                <span>⚡</span>
                <span>Start Your Premium Trial</span>
              </h2>

              {userStatus && (
                <div className="mb-6">
                  <StatusMessage status={userStatus} />

                  {userStatus.showCountdown && userData?.trial_expiration && (
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
                    className="py-4 px-6 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 71 55"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"
                        fill="currentColor"
                      />
                    </svg>
                    Login with Discord
                  </button>
                </div>
              ) : userStatus?.showForm ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label
                      htmlFor="ign"
                      className="block text-white/90 font-medium mb-2"
                    >
                      In-Game Name
                    </label>
                    <input
                      type="text"
                      id="ign"
                      value={ign}
                      onChange={(e) => setIgn(e.target.value)}
                      placeholder="Enter your IGN"
                      required
                      className="w-full p-3.5 rounded-xl border border-white/20 bg-white/8 text-white backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/10 transition-all"
                    />
                  </div>

                  <div className="mb-6">
                    <label
                      htmlFor="referral"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Referred By
                    </label>
                    <input
                      type="text"
                      id="referral"
                      value={referral}
                      onChange={(e) => setReferral(e.target.value)}
                      placeholder="IGN of who referred you? (Optional)"
                      className="w-full p-3.5 rounded-xl border border-white/20 bg-white/8 text-white backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/10 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] text-black font-bold text-lg uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    <span className="relative z-10">
                      {isSubmitting
                        ? "Processing..."
                        : "Activate Premium Trial"}
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:animate-shimmer"></span>
                  </button>

                  {statusMessage.type && (
                    <div
                      className={`mt-6 p-4 rounded-lg text-center ${
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
                </form>
              ) : (
                <div className="text-center">
                  {userStatus?.type === "whitelisted" && (
                    <p className="text-white/90 text-lg">
                      You already have full access to all premium features.
                      Enjoy!
                    </p>
                  )}

                  {userStatus?.type === "whitelisted_trial" && (
                    <p className="text-white/90 text-lg">
                      You have full access during your trial period. A staff
                      member will contact you soon to complete your purchase.
                    </p>
                  )}

                  {userStatus?.type === "active_trial" && (
                    <p className="text-white/90 text-lg">
                      Your trial is currently active. A staff member will
                      contact you soon to complete your purchase.
                    </p>
                  )}

                  {userStatus?.type === "expired_trial" && (
                    <p className="text-white/90 text-lg">
                      Your trial has expired. Please contact a staff member to
                      complete your purchase.
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="text-center text-[#ffd700] font-medium text-lg mt-8">
              Enjoy your exclusive experience!
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }

        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
