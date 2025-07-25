"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, BookOpen, Timer, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { createClient } from "@/lib/supabase/client";
import {
  getDiscordId,
  getUsername,
  getAvatarUrl,
  formatDate,
  isSlowConnection,
} from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { withTimeout } from "@/lib/timeout";

// ============================================================================
// ONBOARDING TOOLTIP COMPONENT
// ============================================================================

interface TooltipStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right";
  showNextButton?: boolean;
}

interface OnboardingTooltipProps {
  step: TooltipStep;
  isVisible: boolean;
  onNext: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
}

const OnboardingTooltip = ({
  step,
  isVisible,
  onNext,
  onSkip,
  currentStep,
  totalSteps,
}: OnboardingTooltipProps) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    if (isVisible && step.target) {
      const updatePosition = () => {
        const element = document.querySelector(`[data-tour="${step.target}"]`);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
          setIsPositioned(true);
        }
      };

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
      };
    }
  }, [isVisible, step.target]);

  const getTooltipPosition = useMemo(() => {
    if (!targetRect) return { top: 0, left: 0 };

    const tooltipWidth = 320;
    const tooltipHeight = 140;
    const gap = 12;

    let top = 0;
    let left = 0;

    switch (step.placement) {
      case "top":
        top = targetRect.top - tooltipHeight - gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - gap;
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + gap;
        break;
    }

    // Ensure tooltip stays within viewport
    const padding = 16;
    top = Math.max(
      padding,
      Math.min(window.innerHeight - tooltipHeight - padding, top)
    );
    left = Math.max(
      padding,
      Math.min(window.innerWidth - tooltipWidth - padding, left)
    );

    return { top, left };
  }, [targetRect, step.placement]);

  if (!isVisible || !isPositioned) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onSkip}
      />

      {/* Spotlight */}
      {targetRect && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        >
          <div className="w-full h-full rounded-xl border-2 border-[#00c6ff] shadow-[0_0_0_4px_rgba(0,198,255,0.3)] bg-[#00c6ff]/10" />
        </motion.div>
      )}

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="fixed z-[10000] w-80 bg-[#141414]/95 backdrop-blur-xl border border-[#00c6ff]/30 rounded-2xl p-6 shadow-2xl"
        style={{
          top: getTooltipPosition.top,
          left: getTooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00c6ff]" />
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep
                    ? "bg-[#00c6ff]"
                    : i < currentStep
                    ? "bg-[#00c6ff]/60"
                    : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={onNext}
              className="px-4 py-1.5 bg-[#00c6ff] hover:bg-[#0099cc] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
            >
              {currentStep === totalSteps - 1 ? "Finish" : "Next"}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ============================================================================
// LIVE COUNTDOWN COMPONENT
// ============================================================================

interface LiveCountdownProps {
  expirationTime: string;
  className?: string;
}

const LiveCountdown = ({
  expirationTime,
  className = "",
}: LiveCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<{
    expired: boolean;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalHours: number;
    percentage: number;
  } | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateTimeLeft = useCallback(() => {
    const expiration = new Date(expirationTime);
    const now = new Date();
    const totalTrialMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const diff = expiration.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        expired: true,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalHours: 0,
        percentage: 0,
      };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const totalHours = Math.floor(totalSeconds / 3600);

    // Calculate percentage of trial time remaining
    const percentage = Math.max(0, Math.min(100, (diff / totalTrialMs) * 100));

    return {
      expired: false,
      days,
      hours,
      minutes,
      seconds,
      totalHours,
      percentage,
    };
  }, [expirationTime]);

  useEffect(() => {
    const updateCountdown = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [calculateTimeLeft]);

  if (!timeLeft) {
    return (
      <div
        className={`animate-pulse bg-white/10 h-20 rounded-xl ${className}`}
      />
    );
  }

  if (timeLeft.expired) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl p-4 text-center ${className}`}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Timer className="w-5 h-5" />
          <span className="font-semibold">Trial Expired</span>
        </div>
        <p className="text-sm opacity-90">Your trial access has ended</p>
      </motion.div>
    );
  }

  const getUrgencyColor = () => {
    if (timeLeft.totalHours <= 24) return "red";
    if (timeLeft.totalHours <= 72) return "yellow";
    return "blue";
  };

  const urgencyColor = getUrgencyColor();
  const colorClasses = {
    red: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
      progress: "bg-red-500",
    },
    yellow: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      progress: "bg-yellow-500",
    },
    blue: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
      progress: "bg-blue-500",
    },
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${colorClasses[urgencyColor].bg} ${colorClasses[urgencyColor].text} ${colorClasses[urgencyColor].border} border rounded-xl p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5" />
          <span className="font-semibold">Trial Active</span>
        </div>
        <span className="text-xs opacity-75 font-medium">
          {timeLeft.percentage.toFixed(1)}% remaining
        </span>
      </div>

      {/* Progress bar */}
      <div className="bg-black/20 rounded-full h-2 mb-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${timeLeft.percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${colorClasses[urgencyColor].progress} rounded-full`}
        />
      </div>

      {/* Countdown */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold tabular-nums">{timeLeft.days}</div>
          <div className="text-xs opacity-75">Days</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">{timeLeft.hours}</div>
          <div className="text-xs opacity-75">Hours</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">
            {timeLeft.minutes}
          </div>
          <div className="text-xs opacity-75">Min</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">
            {timeLeft.seconds}
          </div>
          <div className="text-xs opacity-75">Sec</div>
        </div>
      </div>

      {/* Expiration date */}
      <div className="text-center mt-3 pt-3 border-t border-current/20">
        <p className="text-xs opacity-75">
          Expires {formatDate(expirationTime)} at{" "}
          {new Date(expirationTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
};

// ============================================================================
// ONBOARDING TOUR CONFIGURATION
// ============================================================================

const TOUR_STEPS: TooltipStep[] = [
  {
    id: "profile-header",
    target: "profile-header",
    title: "Welcome to Your Profile!",
    content:
      "This is your personal dashboard where you can view your account details and manage your blueprint selections.",
    placement: "bottom",
  },
  {
    id: "trial-status",
    target: "trial-status",
    title: "Live Trial Countdown",
    content:
      "Watch your trial time tick down in real-time! This meter shows exactly how much premium access you have left.",
    placement: "left",
  },
  {
    id: "blueprints-section",
    target: "blueprints-section",
    title: "Blueprint Management",
    content:
      "This is where you pick blueprints—search or select all! Your selections will be used in the Crafting Calculator.",
    placement: "top",
  },
  {
    id: "search-blueprints",
    target: "search-blueprints",
    title: "Quick Blueprint Search",
    content:
      "Use this search to quickly find specific blueprints. You can also use the category filters below!",
    placement: "bottom",
  },
];

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const BLUEPRINT_CATEGORIES = {
  Weapons: [
    "AK-74",
    "AKS-74U",
    "CheyTac M200 Intervention",
    "Colt 1911",
    "Desert Eagle",
    "M16A2",
    "M16A2 - AUTO",
    "M16 Carbine",
    "M21 SWS",
    "M249 SAW",
    "M416",
    "M9",
    "MP 43 1C",
    "MP5A2",
    "MP7A2",
    "PKM",
    "PM",
    "RPK-74",
    "Sa-58P",
    "Sa-58V",
    "Scar-H",
    "SIG MCX",
    "SIG MCX SPEAR",
    "SSG10A2-Sniper",
    "Steyr AUG",
    "SR-25 Rifle",
    "SVD",
  ],

  Magazines: [
    "30rnd 9x19 Mag",
    "8rnd .45 ACP",
    "9x18mm 8rnd PM Mag",
    "9x19mm 15rnd M9 Mag",
    ".300 Blackout Mag",
    ".338 5rnd FMJ",
    ".50 AE 7rnd Mag",
    "12/70 7mm Buckshot",
    "4.6x40 40rnd Mag",
    "5.45x39mm 30rnd AK Mag",
    "5.45x39mm 45rnd RPK-74 Tracer Mag",
    "5.56x45mm 30rnd AUG Mag",
    "5.56x45mm 30rnd STANAG Mag",
    "5.56x45mm 200rnd M249 Belt",
    "7Rnd M200 Magazine",
    "7.62x39mm 30rnd Sa-58 Mag",
    "7.62x51mm FMJ",
    "7.62x51mm 20rnd M14 Mag",
    "7.62x51mm 30rnd Mag",
    "SR25 7.62x51mm 20rnd",
    "7.62x54mmR 100rnd PK Belt",
    "7.62x54mmR 10rnd SVD Sniper Mag",
    "SPEAR 6.8x51 25rnd",
  ],

  Attachments: [
    "A2 Flash Hider",
    "ART II Scope",
    "Carry Handle Red-Dot-Sight",
    "EOTECH XPS3",
    "Elcan Specter",
    "Leupold VX-6",
    "PSO-1 Scope",
    "Reflex Scope",
    "Vortex RazorHD Gen2",
    "4x20 Carry Handle Scope",
    "4.7mm FlashHider",
    "6.8x51mm FlashHider",
    "6P26 Flash Hider",
    "6P20 Muzzle Brake",
    "7.62x51mm FlashHider",
  ],

  Vehicles: [
    "M1025 Light Armoured Vehicle",
    "M151A2 Off-Road",
    "M151A2 Off-Road Open Top",
    "M923A1 Fuel Truck",
    "M923A1 Transport Truck",
    "M923A1 Transport Truck - Canopy",
    "M998 Light Utility Vehicle",
    "M998 Light Utility Vehicle - Canopy",
    "Mi-8MT Transport Helicopter",
    "Pickup-Truck",
    "S105 Car",
    "S1203 Minibus",
    "S1203 - Laboratory",
    "UAZ-452 Off-road",
    "UAZ-452 Off-road - Laboratory",
    "UAZ-469 Off-road",
    "UAZ-469 Off-road - Open Top",
    "UH-1H Transport Helicopter",
    "Ural-4320 Fuel Truck",
    "Ural-4320 Transport Truck",
    "Ural-4320 Transport Truck - Canopy",
    "Ural (Device)",
    "VW Rolf",
  ],

  Vests: ["6B2 Vest", "6B3 Vest", "M69 Vest", "PASGT Vest", "Plate Carrier", "TTV110"],

  Helmets: [
    "PASGT Helmet",
    "PASGT Helmet - Camouflaged",
    "PASGT Helmet - Camouflaged Netting",
    "SPH-4 Helmet",
    "SSh-68 Helmet",
    "SSh-68 Helmet - Camouflaged",
    "SSh-68 Helmet - Cover",
    "SSh-68 Helmet - KZS",
    "SSh-68 Helmet - Netting",
    "ZSh-5 Helmet",
  ],

  Clothes: [
    "ADA Assault Pack",
    "ALICE Medium Backpack",
    "Bandana",
    "Balaclava",
    "BDU Blouse",
    "BDU Blouse - Rolled-up",
    "BDU Trousers",
    "Beanie",
    "Beret",
    "Boonie",
    "Cap - All Variants",
    "Cargo Pants",
    "Cargo Pants (Colored)",
    "Cardigan",
    "Classic Shoe",
    "Cotton Shirt",
    "CWU-27 Pilot Coveralls",
    "Dress",
    "Fedora",
    "Fisher Hat",
    "Flat Cap",
    "Half Mask",
    "Hard Hat",
    "Hoodie",
    "Hunting Vest",
    "IIFS Large Combat Field Pack",
    "Jacket",
    "Jeans",
    "Jeans (Colored)",
    "Jungle Boots",
    "KLMK Coveralls",
    "Knit Cap",
    "Kolobok Backpack",
    "KZS Pants",
    "Leather Jacket (old)",
    "Lumber Jacket - All Variants",
    "M70 Backpack",
    "M70 Cap",
    "M70 Parka",
    "M70 Trousers",
    "M88 Field Cap",
    "M88 Jacket",
    "M88 Jacket - Rolled-up",
    "M88 Trousers",
    "Mask (Medical)",
    "Mask (Latex)",
    "Mask (Ski)",
    "Officer's Cap",
    "Panamka",
    "Paper Bag",
    "Polo",
    "Pullover",
    "Raincoat",
    "Robe",
    "Runner Shoe",
    "Sneaker",
    "Soviet Combat Boots",
    "Soviet Pilot Jacket",
    "Soviet Pilot Pants",
    "Suit Jacket",
    "Suit Pants",
    "Sweater",
    "Sweat Pants",
    "Track Jacket",
    "Track Pants",
    "TShirt",
    "US Combat Boots",
    "Veshmeshok Backpack",
    "Wool Hat",
  ],

  "HQ Components": [
    "Ammo (HQ)",
    "Attachment Part (HQ)",
    "Component (HQ)",
    "Engine Part (HQ)",
    "Interior Part (HQ)",
    "Kevlar",
    "Mechanical Component (HQ)",
    "Rotor (HQ)",
    "Stabilizer (HQ)",
    "Weapon Part (HQ)",
    "Special Rotor",
    "Special Gun Barrel",
  ],

  Components: [
    "Cloth",
    "Iron Plate",
    "Component",
    "Tempered Glass",
    "Weapon Part",
    "Stabilizer",
    "Attachment Part",
    "Ammo",
    "Mechanical Component",
    "Engine Part",
    "Interior Part",
    "Rotor",
  ],
};

const PROFILE_CACHE_KEY = "profile_data_cache";
const BLUEPRINTS_CACHE_KEY = "blueprints_cache";
const ONBOARDING_COMPLETED_KEY = "profile_onboarding_completed";
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface UserProfile {
  created_at: string | null;
  last_login: string | null;
  revoked: boolean | null;
  login_count: number | null;
  discord_id: string;
  username: string | null;
  hub_trial: boolean | null;
  trial_expiration: string | null;
}

interface Blueprint {
  id: string;
  discord_id: string | null;
  blueprint_name: string;
  created_at: string | null;
}

interface CombinedData {
  profile: UserProfile | null;
  blueprints: Blueprint[];
}

interface LoadingState {
  profile: boolean;
  blueprints: boolean;
  saving: boolean;
}

interface ErrorState {
  profile: string | null;
  blueprints: string | null;
  saving: string | null;
}

// ============================================================================
// MAIN PROFILE PAGE COMPONENT
// ============================================================================

export default function ProfilePage() {
  usePageTracking();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const supabase = createClient();

  // Enhanced state management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ownedBlueprints, setOwnedBlueprints] = useState<string[]>([]); // User's saved selections from DB
  const [selectedBlueprints, setSelectedBlueprints] = useState<Set<string>>(
    new Set()
  ); // Current UI selections

  // Get all available blueprints from categories (excluding HQ Components and Components from count)
  const allAvailableBlueprints = useMemo(() => {
    return Object.values(BLUEPRINT_CATEGORIES).flat().sort();
  }, []);

  // Get blueprints that count towards the total (excluding HQ Components and Components)
  const countableBlueprints = useMemo(() => {
    const excludedCategories = ["HQ Components", "Components"];
    return Object.entries(BLUEPRINT_CATEGORIES)
      .filter(([category]) => !excludedCategories.includes(category))
      .flatMap(([, blueprints]) => blueprints)
      .sort();
  }, []);

  // Get default selected blueprints (HQ Components + Components)
  const defaultSelectedBlueprints = useMemo(() => {
    return [
      ...BLUEPRINT_CATEGORIES["HQ Components"],
      ...BLUEPRINT_CATEGORIES["Components"],
    ];
  }, []);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    profile: false,
    blueprints: false,
    saving: false,
  });
  const [errorState, setErrorState] = useState<ErrorState>({
    profile: null,
    blueprints: null,
    saving: null,
  });
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isSlowConn, setIsSlowConn] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Refs for tracking loading attempts and timeouts
  const loadAttemptsRef = useRef<{ profile: number; blueprints: number }>({
    profile: 0,
    blueprints: 0,
  });
  const timeoutsRef = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const isMountedRef = useRef(true);

  // Check for slow connection and onboarding status
  useEffect(() => {
    setIsSlowConn(isSlowConnection());

    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (!onboardingCompleted && user) {
      // Delay showing onboarding until profile loads
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Onboarding handlers
  const handleNextTourStep = () => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      setCurrentTourStep(currentTourStep + 1);
    } else {
      handleSkipTour();
    }
  };

  const handleSkipTour = () => {
    setShowOnboarding(false);
    setCurrentTourStep(0);
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  };

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      Object.values(timeoutsRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Load user profile and blueprints data using the RPC function
  const loadUserData = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;

      setLoadingState((prev) => ({
        ...prev,
        profile: true,
        blueprints: true,
      }));

      try {
        const discordId = getDiscordId(user);
        if (!discordId) {
          setErrorState((prev) => ({
            ...prev,
            profile: "Could not determine Discord ID",
          }));
          setLoadingState((prev) => ({
            ...prev,
            profile: false,
            blueprints: false,
          }));
          return;
        }

        // Check cache first if not forcing refresh
        if (!forceRefresh) {
          const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
          const cachedBlueprints = localStorage.getItem(BLUEPRINTS_CACHE_KEY);

          if (cachedProfile && cachedBlueprints) {
            try {
              const { data: profileData, timestamp: profileTimestamp } =
                JSON.parse(cachedProfile);
              const { data: blueprintsData, timestamp: blueprintsTimestamp } =
                JSON.parse(cachedBlueprints);

              const isProfileFresh = Date.now() - profileTimestamp < CACHE_TTL;
              const areBlueprintsFresh =
                Date.now() - blueprintsTimestamp < CACHE_TTL;

              if (isProfileFresh && profileData.discord_id === discordId) {
                setUserProfile(profileData);
                setLoadingState((prev) => ({ ...prev, profile: false }));
              }

              if (areBlueprintsFresh) {
                setOwnedBlueprints(blueprintsData); // User's saved selections
                initializeSelectedBlueprints(blueprintsData);
                setLoadingState((prev) => ({ ...prev, blueprints: false }));

                if (isProfileFresh) return;
              }
            } catch (error) {
              console.error("Error parsing cached data:", error);
            }
          }
        }

        // Use the RPC function to get both profile and blueprints in one call
        const { data, error } = await withTimeout(
          supabase.rpc("get_profile_and_blueprints", {
            user_discord_id: discordId,
          })
        );

        if (error) {
          console.error("Error fetching user data:", error);
          setErrorState((prev) => ({
            ...prev,
            profile: "Failed to load user data",
          }));
          setLoadingState((prev) => ({
            ...prev,
            profile: false,
            blueprints: false,
          }));
          return;
        }

        const combinedData = data as CombinedData;

        if (combinedData.profile) {
          setUserProfile(combinedData.profile);
          localStorage.setItem(
            PROFILE_CACHE_KEY,
            JSON.stringify({
              data: combinedData.profile,
              timestamp: Date.now(),
            })
          );
        }

        if (combinedData.blueprints && Array.isArray(combinedData.blueprints)) {
          const blueprintNames = combinedData.blueprints.map(
            (bp) => bp.blueprint_name
          );
          setOwnedBlueprints(blueprintNames); // This is just for reference, not filtering

          localStorage.setItem(
            BLUEPRINTS_CACHE_KEY,
            JSON.stringify({
              data: blueprintNames,
              timestamp: Date.now(),
            })
          );

          initializeSelectedBlueprints(blueprintNames);
        } else {
          // If no saved blueprints, start with empty selection
          initializeSelectedBlueprints([]);
        }

        setLoadingState((prev) => ({
          ...prev,
          profile: false,
          blueprints: false,
        }));
      } catch (error) {
        console.error("Error loading user data:", error);
        setErrorState((prev) => ({
          ...prev,
          profile: "Failed to load user data",
        }));
        setLoadingState((prev) => ({
          ...prev,
          profile: false,
          blueprints: false,
        }));
      }
    },
    [user, supabase]
  );

  // Initialize selected blueprints from localStorage or database
  const initializeSelectedBlueprints = useCallback(
    (savedBlueprints: string[]) => {
      const saved = localStorage.getItem("selected_blueprints");
      let initialSelections = new Set(defaultSelectedBlueprints); // Start with HQ Components + Components

      if (saved) {
        try {
          const savedSelections = JSON.parse(saved);
          // Only keep valid blueprint names that exist in our categories
          const validSelections = savedSelections.filter((bp: string) =>
            allAvailableBlueprints.includes(bp)
          );
          initialSelections = new Set([
            ...defaultSelectedBlueprints,
            ...validSelections,
          ]);
        } catch (error) {
          console.error("Error parsing saved blueprints:", error);
          // Fall back to database selections + defaults
          initialSelections = new Set([
            ...defaultSelectedBlueprints,
            ...savedBlueprints,
          ]);
        }
      } else {
        // Use database selections + defaults as initial state
        initialSelections = new Set([
          ...defaultSelectedBlueprints,
          ...savedBlueprints,
        ]);
      }

      setSelectedBlueprints(initialSelections);
    },
    [allAvailableBlueprints, defaultSelectedBlueprints]
  );

  // Save blueprint selections
  const saveBlueprintSelections = useCallback(async () => {
    if (!user) return;

    setLoadingState((prev) => ({ ...prev, saving: true }));
    setSaveStatus({ type: null, message: "" });

    try {
      const discordId = getDiscordId(user);
      if (!discordId) {
        throw new Error("Could not determine Discord ID");
      }

      // Filter out default components that are always selected (don't save to DB)
      const blueprintsToSave = Array.from(selectedBlueprints).filter(
        (blueprint) => !defaultSelectedBlueprints.includes(blueprint)
      );

      // Delete existing blueprints for this user
      const { error: deleteError } = await withTimeout(
        supabase.from("user_blueprints").delete().eq("discord_id", discordId)
      );

      if (deleteError) {
        console.error("Error deleting existing blueprints:", deleteError);
        throw deleteError;
      }

      // Insert new blueprints if any are selected
      if (blueprintsToSave.length > 0) {
        const inserts = blueprintsToSave.map((name) => ({
          discord_id: discordId,
          blueprint_name: name,
        }));

        const { error: insertError } = await withTimeout(
          supabase.from("user_blueprints").insert(inserts)
        );

        if (insertError) {
          console.error("Error inserting blueprints:", insertError);
          throw insertError;
        }
      }

      // Update local cache
      localStorage.setItem(
        "selected_blueprints",
        JSON.stringify(Array.from(selectedBlueprints))
      );

      // Update the cached blueprints data
      localStorage.setItem(
        BLUEPRINTS_CACHE_KEY,
        JSON.stringify({
          data: blueprintsToSave,
          timestamp: Date.now(),
        })
      );

      // Update ownedBlueprints state for change detection
      setOwnedBlueprints(blueprintsToSave);

      // Count only non-default blueprints for success message
      const countableSelected = Array.from(selectedBlueprints).filter(
        (bp) => !defaultSelectedBlueprints.includes(bp)
      ).length;

      setSaveStatus({
        type: "success",
        message: `✅ Successfully saved ${countableSelected} blueprint selections!`,
      });

      setTimeout(() => {
        setSaveStatus({ type: null, message: "" });
      }, 3000);
    } catch (error) {
      console.error("Error saving blueprint selections:", error);
      setSaveStatus({
        type: "error",
        message: "❌ Failed to save blueprint selections. Please try again.",
      });

      setTimeout(() => {
        setSaveStatus({ type: null, message: "" });
      }, 5000);
    } finally {
      setLoadingState((prev) => ({ ...prev, saving: false }));
    }
  }, [user, selectedBlueprints, supabase, defaultSelectedBlueprints]);

  // Blueprint selection handlers
  const toggleBlueprint = useCallback((blueprint: string) => {
    setSelectedBlueprints((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blueprint)) {
        newSet.delete(blueprint);
      } else {
        newSet.add(blueprint);
      }
      return newSet;
    });
  }, []);

  const toggleCategory = useCallback(
    (category: string) => {
      const categoryBlueprints =
        BLUEPRINT_CATEGORIES[category as keyof typeof BLUEPRINT_CATEGORIES];
      const allSelected = categoryBlueprints.every((bp) =>
        selectedBlueprints.has(bp)
      );

      setSelectedBlueprints((prev) => {
        const newSet = new Set(prev);
        if (allSelected) {
          categoryBlueprints.forEach((bp) => newSet.delete(bp));
        } else {
          categoryBlueprints.forEach((bp) => newSet.add(bp));
        }
        return newSet;
      });
    },
    [selectedBlueprints]
  );

  const selectAll = useCallback(() => {
    setSelectedBlueprints(new Set(allAvailableBlueprints));
  }, [allAvailableBlueprints]);

  const deselectAll = useCallback(() => {
    // Keep default selections (HQ Components + Components) even when "deselecting all"
    setSelectedBlueprints(new Set(defaultSelectedBlueprints));
  }, [defaultSelectedBlueprints]);

  // Filter blueprints based on search and category
  const filteredBlueprints = useMemo(() => {
    let blueprints = allAvailableBlueprints;

    if (selectedCategory !== "all") {
      const categoryBlueprints =
        BLUEPRINT_CATEGORIES[
          selectedCategory as keyof typeof BLUEPRINT_CATEGORIES
        ];
      blueprints = blueprints.filter((bp) => categoryBlueprints.includes(bp));
    }

    if (searchQuery) {
      blueprints = blueprints.filter((bp) =>
        bp.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return blueprints.sort();
  }, [allAvailableBlueprints, selectedCategory, searchQuery]);

  // Load data on mount
  useEffect(() => {
    if (user && !authLoading) {
      loadUserData();
    }
  }, [user, authLoading, loadUserData]);

  // Calculate stats (exclude HQ Components and Components from count)
  const { selected, total } = useMemo(() => {
    const countableSelected = Array.from(selectedBlueprints).filter((bp) =>
      countableBlueprints.includes(bp)
    ).length;

    return {
      selected: countableSelected,
      total: countableBlueprints.length,
    };
  }, [selectedBlueprints, countableBlueprints]);

  // Check if there are any changes from the initial state (for save button state)
  const hasChanges = useMemo(() => {
    const currentSelectionsArray = Array.from(selectedBlueprints).sort();
    const initialSelectionsArray = [
      ...defaultSelectedBlueprints,
      ...ownedBlueprints,
    ].sort();

    return (
      JSON.stringify(currentSelectionsArray) !==
      JSON.stringify(initialSelectionsArray)
    );
  }, [selectedBlueprints, defaultSelectedBlueprints, ownedBlueprints]);

  // Handle authentication loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Handle not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-400 mb-6">
            Please log in to view your profile.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#00c6ff] hover:bg-[#0099cc] text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] pt-24 pb-12 px-4 relative">
      <div className="max-w-6xl mx-auto">
        {/* Profile Card */}
        <div
          className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 mb-6 relative overflow-hidden"
          data-tour="profile-header"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00c6ff]/50 to-transparent"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
            {/* Avatar with loading states */}
            <div className="relative w-24 h-24 rounded-full border-3 border-[#00c6ff]/30 bg-gradient-to-br from-[#00c6ff]/20 to-[#0072ff]/20 overflow-hidden flex-shrink-0">
              {loadingState.profile && !avatarLoaded && !avatarError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background-secondary/80 backdrop-blur-sm z-10">
                  <LoadingSpinner size="sm" />
                </div>
              )}

              <Image
                src={
                  user
                    ? getAvatarUrl(user)
                    : "https://cdn.discordapp.com/embed/avatars/0.png"
                }
                alt="Avatar"
                width={96}
                height={96}
                className={`rounded-full object-cover transition-opacity duration-300 ${
                  avatarLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setAvatarLoaded(true)}
                onError={() => {
                  setAvatarError(true);
                  setAvatarLoaded(true);
                }}
                priority
              />

              {avatarError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background-secondary/80 text-white text-2xl font-bold">
                  {getUsername(user)?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-[#e8e8e8] inline-block text-transparent bg-clip-text break-words">
                {loadingState.profile ? (
                  <span className="inline-block w-48 h-8 bg-white/10 animate-pulse rounded"></span>
                ) : (
                  getUsername(user)
                )}
              </h1>
              <div className="text-[#a0a0a0]">Discord Profile</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Discord ID */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">
                Discord ID
              </div>
              <div className="text-white font-semibold break-all">
                {loadingState.profile ? (
                  <div className="w-full h-5 bg-white/10 animate-pulse rounded"></div>
                ) : (
                  getDiscordId(user)
                )}
              </div>
            </div>

            {/* Status */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">
                Status
              </div>
              <div>
                {loadingState.profile ? (
                  <div className="w-32 h-7 bg-white/10 animate-pulse rounded-full"></div>
                ) : (
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                      userProfile?.revoked
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-green-500/20 text-green-400 border border-green-500/30"
                    }`}
                  >
                    {userProfile?.revoked ? "Access Revoked" : "Whitelisted"}
                  </span>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">
                Member Since
              </div>
              <div className="text-white font-semibold">
                {loadingState.profile ? (
                  <div className="w-24 h-5 bg-white/10 animate-pulse rounded"></div>
                ) : (
                  formatDate(userProfile?.created_at)
                )}
              </div>
            </div>

            {/* Last Login */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">
                Last Login
              </div>
              <div className="text-white font-semibold">
                {loadingState.profile ? (
                  <div className="w-24 h-5 bg-white/10 animate-pulse rounded"></div>
                ) : (
                  formatDate(userProfile?.last_login)
                )}
              </div>
            </div>

            {/* Login Count */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">
                Login Count
              </div>
              <div className="text-white font-semibold">
                {loadingState.profile ? (
                  <div className="w-12 h-5 bg-white/10 animate-pulse rounded"></div>
                ) : (
                  userProfile?.login_count || 0
                )}
              </div>
            </div>

            {/* Live Trial Status */}
            {userProfile?.hub_trial && userProfile?.trial_expiration && (
              <div
                className="md:col-span-2 lg:col-span-1"
                data-tour="trial-status"
              >
                <LiveCountdown
                  expirationTime={userProfile.trial_expiration}
                  className="h-full"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => signOut()}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none py-4 px-8 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md w-full md:w-auto"
          >
            Sign Out
          </button>
        </div>

        {/* Blueprints Section */}
        <div
          className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 relative overflow-hidden"
          data-tour="blueprints-section"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00c6ff]/50 to-transparent"></div>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              My Blueprints
            </h2>
            <div className="bg-[#00c6ff]/10 border border-[#00c6ff]/20 text-[#00c6ff] py-2 px-5 rounded-xl font-semibold text-sm inline-block mb-4">
              {loadingState.blueprints ? (
                <div className="w-48 h-6 bg-white/10 animate-pulse rounded"></div>
              ) : (
                `📃 Selected: ${selected} / ${total} Blueprints`
              )}
            </div>

            <p className="text-[#a0a0a0] text-base max-w-2xl mx-auto">
              Select the blueprints you currently own. These will appear in the
              Crafting Calculator and help optimize your gameplay experience.
              Choose from {countableBlueprints.length} available blueprints!
              <br />
              <span className="text-sm text-[#a0a0a0]/80 mt-1 block">
                Note: HQ Components and Components are automatically included
                and don't count toward your total.
              </span>
            </p>
          </div>

          {/* Search and Controls */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div
              className="relative max-w-md mx-auto"
              data-tour="search-blueprints"
            >
              <input
                type="text"
                placeholder="Search blueprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#00c6ff]/50 focus:bg-white/10 transition-all"
              />
              <BookOpen className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === "all"
                    ? "bg-[#00c6ff] text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                All Categories
              </button>
              {Object.keys(BLUEPRINT_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-[#00c6ff] text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={selectAll}
                disabled={loadingState.blueprints || selected === total}
                className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium hover:bg-green-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select All ({total})
              </button>
              <button
                onClick={deselectAll}
                disabled={loadingState.blueprints || selected === 0}
                className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deselect All
              </button>
              {selectedCategory !== "all" &&
                !["HQ Components", "Components"].includes(selectedCategory) && (
                  <button
                    onClick={() => toggleCategory(selectedCategory)}
                    disabled={loadingState.blueprints}
                    className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Toggle {selectedCategory}
                  </button>
                )}
            </div>
          </div>

          {/* Loading, Error, and Content States */}
          {loadingState.profile || loadingState.blueprints ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" />
              <p className="text-[#a0a0a0] mt-4">
                {isSlowConn
                  ? "Loading blueprints (slow connection detected)..."
                  : "Loading your blueprints..."}
              </p>
            </div>
          ) : errorState.profile || errorState.blueprints ? (
            <div className="text-center py-12">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-2">
                  Error Loading Data
                </h3>
                <p className="mb-4">
                  {errorState.profile || errorState.blueprints}
                </p>
                <button
                  onClick={() => loadUserData(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Blueprint Grid */}
              {filteredBlueprints.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  <AnimatePresence mode="popLayout">
                    {filteredBlueprints.map((blueprint) => (
                      <motion.div
                        key={blueprint}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${
                          selectedBlueprints.has(blueprint)
                            ? "bg-[#00c6ff]/10 border-[#00c6ff]/50 shadow-[0_0_20px_rgba(0,198,255,0.2)]"
                            : "bg-white/[0.03] border-white/10 hover:border-[#00c6ff]/30 hover:bg-white/[0.05]"
                        } ${
                          defaultSelectedBlueprints.includes(blueprint)
                            ? "opacity-60 cursor-not-allowed"
                            : ""
                        }`}
                        onClick={() => {
                          // Prevent deselecting default blueprints (HQ Components + Components)
                          if (!defaultSelectedBlueprints.includes(blueprint)) {
                            toggleBlueprint(blueprint);
                          }
                        }}
                      >
                        <div className="text-white font-medium text-sm leading-relaxed">
                          {blueprint}
                          {defaultSelectedBlueprints.includes(blueprint) && (
                            <span className="block text-xs text-[#00c6ff]/80 mt-1">
                              (Auto-included)
                            </span>
                          )}
                        </div>
                        {selectedBlueprints.has(blueprint) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-[#00c6ff] rounded-full flex items-center justify-center text-white text-xs font-bold"
                          >
                            ✓
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">
                    No blueprints found
                  </div>
                  <p className="text-gray-500 text-sm">
                    {searchQuery || selectedCategory !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "No blueprints match your current filters"}
                  </p>
                </div>
              )}

              {/* Save Button */}
              {total > 0 && (
                <div className="text-center">
                  <button
                    onClick={saveBlueprintSelections}
                    disabled={loadingState.saving || !hasChanges}
                    className="bg-gradient-to-r from-[#00c6ff] to-[#0099cc] text-white border-none py-4 px-8 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[200px]"
                  >
                    {loadingState.saving ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span>Saving...</span>
                      </div>
                    ) : hasChanges ? (
                      `Save Changes (${selected})`
                    ) : (
                      `No Changes to Save`
                    )}
                  </button>

                  {/* Save Status Message */}
                  <AnimatePresence>
                    {saveStatus.message && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                          saveStatus.type === "success"
                            ? "bg-green-500/10 border border-green-500/20 text-green-400"
                            : "bg-red-500/10 border border-red-500/20 text-red-400"
                        }`}
                      >
                        {saveStatus.message}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Onboarding Tour */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingTooltip
            step={TOUR_STEPS[currentTourStep]}
            isVisible={showOnboarding}
            onNext={handleNextTourStep}
            onSkip={handleSkipTour}
            currentStep={currentTourStep}
            totalSteps={TOUR_STEPS.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
