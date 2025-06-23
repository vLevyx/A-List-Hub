"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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

// Default categories that should be checked by default
const DEFAULT_ON_CATEGORIES = ["Components", "HQ Components"];

type CategoryKey = keyof typeof itemsByCategory;

// Blueprint categories and items
const itemsByCategory: { [key: string]: string[] } = {
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

  Vests: ["6B2 Vest", "6B3 Vest", "M69 Vest", "PASGT Vest"],

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
    "ALICE Medium Backpack",
    "Bandana",
    "Balaclava",
    "BDU Blouse",
    "BDU Blouse - Rolled-up",
    "BDU Trousers",
    "Beanie",
    "Boonie",
    "Cap - All Variants",
    "Cargo Pants",
    "Cargo Pants (Colored)",
    "Cardigan",
    "Classic Shoe",
    "CWU-27 Pilot Coveralls",
    "Dress",
    "Fedora",
    "Fisher Hat",
    "Flat Cap",
    "Half Mask",
    "Hunting Vest",
    "IIFS Large Combat Field Pack",
    "Jacket",
    "Jeans",
    "Jeans (Colored)",
    "KLMK Coveralls",
    "Knit Cap",
    "Kolobok Backpack",
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

// Local storage keys
const PROFILE_CACHE_KEY = "profile_data_cache";
const BLUEPRINTS_CACHE_KEY = "blueprints_cache";
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

export default function ProfilePage() {
  usePageTracking();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const supabase = createClient();

  // Enhanced state management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ownedBlueprints, setOwnedBlueprints] = useState<string[]>([]);
  const [selectedBlueprints, setSelectedBlueprints] = useState<Set<string>>(
    new Set()
  );
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

  // Refs for tracking loading attempts and timeouts
  const loadAttemptsRef = useRef<{ profile: number; blueprints: number }>({
    profile: 0,
    blueprints: 0,
  });
  const timeoutsRef = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const isMountedRef = useRef(true);

  // Check for slow connection
  useEffect(() => {
    setIsSlowConn(isSlowConnection());
  }, []);

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
                setOwnedBlueprints(blueprintsData);
                initializeSelectedBlueprints(blueprintsData);
                setLoadingState((prev) => ({ ...prev, blueprints: false }));

                // If both are fresh, we can return early
                if (isProfileFresh) return;
              }
            } catch (error) {
              console.error("Error parsing cached data:", error);
              // Continue with API fetch if cache parsing fails
            }
          }
        }

        // Use the RPC function to get both profile and blueprints in one call
        const { data, error } = await supabase.rpc(
          "get_profile_and_blueprints",
          { user_discord_id: discordId }
        );

        if (error) {
          console.error("Error fetching user data:", error);

          // Increment attempt counter
          loadAttemptsRef.current.profile++;

          // Retry logic
          if (loadAttemptsRef.current.profile < 3) {
            timeoutsRef.current.profileRetry = setTimeout(() => {
              if (isMountedRef.current) {
                loadDataSeparately();
              }
            }, 1000 * loadAttemptsRef.current.profile);
            return;
          }

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

        // Parse the returned data
        const combinedData = data as CombinedData;

        if (combinedData.profile) {
          setUserProfile(combinedData.profile);

          // Cache profile data
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
          setOwnedBlueprints(blueprintNames);

          // Cache blueprints data
          localStorage.setItem(
            BLUEPRINTS_CACHE_KEY,
            JSON.stringify({
              data: blueprintNames,
              timestamp: Date.now(),
            })
          );

          // Initialize selected blueprints
          initializeSelectedBlueprints(blueprintNames);
        }

        setLoadingState((prev) => ({
          ...prev,
          profile: false,
          blueprints: false,
        }));
      } catch (error) {
        console.error("Failed to load user data:", error);
        setErrorState((prev) => ({
          ...prev,
          profile: "An unexpected error occurred",
          blueprints: "An unexpected error occurred",
        }));
      } finally {
        setLoadingState((prev) => ({
          ...prev,
          profile: false,
          blueprints: false,
        }));
      }
    },
    [user, supabase]
  );

  // Fallback method if RPC fails
  const loadDataSeparately = useCallback(async () => {
    if (!user) return;

    setLoadingState((prev) => ({ ...prev, profile: true, blueprints: true }));

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

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("discord_id", discordId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching user profile:", profileError);
        setErrorState((prev) => ({
          ...prev,
          profile: "Failed to load profile data",
        }));
      } else if (profileData) {
        setUserProfile(profileData);

        // Cache profile data
        localStorage.setItem(
          PROFILE_CACHE_KEY,
          JSON.stringify({
            data: profileData,
            timestamp: Date.now(),
          })
        );
      }

      setLoadingState((prev) => ({ ...prev, profile: false }));

      // Load blueprints
      const { data: blueprintsData, error: blueprintsError } = await supabase
        .from("user_blueprints")
        .select("*")
        .eq("discord_id", discordId);

      if (blueprintsError) {
        console.error("Error fetching blueprints:", blueprintsError);
        setErrorState((prev) => ({
          ...prev,
          blueprints: "Failed to load blueprints",
        }));
      } else if (blueprintsData) {
        const blueprintNames = blueprintsData.map((bp) => bp.blueprint_name);
        setOwnedBlueprints(blueprintNames);

        // Cache blueprints data
        localStorage.setItem(
          BLUEPRINTS_CACHE_KEY,
          JSON.stringify({
            data: blueprintNames,
            timestamp: Date.now(),
          })
        );

        // Initialize selected blueprints
        initializeSelectedBlueprints(blueprintNames);
      }

      setLoadingState((prev) => ({ ...prev, blueprints: false }));
    } catch (error) {
      console.error("Failed to load data separately:", error);
      setErrorState((prev) => ({
        ...prev,
        profile: prev.profile || "An unexpected error occurred",
        blueprints: prev.blueprints || "An unexpected error occurred",
      }));
    } finally {
      setLoadingState((prev) => ({
        ...prev,
        profile: false,
        blueprints: false,
      }));
    }
  }, [user, supabase]);

  // Initialize selected blueprints
  const initializeSelectedBlueprints = useCallback(
    (blueprintNames: string[]) => {
      const initialSelected = new Set<string>();

      // Add owned blueprints
      blueprintNames.forEach((name) => initialSelected.add(name));

      // Add default categories
      DEFAULT_ON_CATEGORIES.forEach((category) => {
        const categoryItems =
          itemsByCategory[category as keyof typeof itemsByCategory];
        if (categoryItems) {
          categoryItems.forEach((item: string) => initialSelected.add(item));
        }
      });

      setSelectedBlueprints(initialSelected);
    },
    []
  );

  // Initialize data
  useEffect(() => {
    if (!authLoading && user) {
      loadUserData();
    } else if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, loadUserData, router]);

  // Handle blueprint toggle
  const handleBlueprintToggle = useCallback((blueprint: string) => {
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

  // Save blueprints with optimistic updates and error handling
  const saveBlueprints = async () => {
    if (!user) return;

    setLoadingState((prev) => ({ ...prev, saving: true }));
    setSaveStatus({ type: null, message: "" });
    setErrorState((prev) => ({ ...prev, saving: null }));

    // Store current selection for rollback if needed
    const previousSelection = new Set(selectedBlueprints);

    try {
      const discordId = getDiscordId(user);
      if (!discordId) {
        throw new Error("Could not determine Discord ID");
      }

      // Filter out default components that are always selected
      const blueprintsToSave = Array.from(selectedBlueprints).filter(
        (blueprint) => {
          // Check if blueprint belongs to a default category
          for (const category of DEFAULT_ON_CATEGORIES) {
            if (itemsByCategory[category]?.includes(blueprint)) {
              return false;
            }
          }
          return true;
        }
      );

      // Optimistic update
      setOwnedBlueprints(blueprintsToSave);

      // Delete existing blueprints
      const { error: deleteError } = await supabase
        .from("user_blueprints")
        .delete()
        .eq("discord_id", discordId);

      if (deleteError) {
        console.error("Error deleting existing blueprints:", deleteError);
        throw deleteError;
      }

      // Insert new blueprints
      if (blueprintsToSave.length > 0) {
        const inserts = blueprintsToSave.map((name) => ({
          discord_id: discordId,
          blueprint_name: name,
        }));

        const { error: insertError } = await supabase
          .from("user_blueprints")
          .insert(inserts);

        if (insertError) {
          console.error("Error inserting blueprints:", insertError);
          throw insertError;
        }
      }

      // Update cache
      localStorage.setItem(
        BLUEPRINTS_CACHE_KEY,
        JSON.stringify({
          data: blueprintsToSave,
          timestamp: Date.now(),
        })
      );

      setSaveStatus({
        type: "success",
        message: "Blueprints saved successfully!",
      });
    } catch (error) {
      console.error("Failed to save blueprints:", error);

      // Rollback to previous selection
      setSelectedBlueprints(previousSelection);

      setSaveStatus({
        type: "error",
        message: "Failed to save blueprints. Please try again.",
      });

      setErrorState((prev) => ({
        ...prev,
        saving:
          error instanceof Error ? error.message : "Unknown error occurred",
      }));
    } finally {
      setLoadingState((prev) => ({ ...prev, saving: false }));

      // Clear status after 3 seconds
      timeoutsRef.current.statusClear = setTimeout(() => {
        if (isMountedRef.current) {
          setSaveStatus({ type: null, message: "" });
        }
      }, 3000);
    }
  };

  // Calculate blueprint counts
  const getBlueprintCounts = useCallback(() => {
    // Count only non-default category blueprints
    const filteredBlueprints = Object.entries(itemsByCategory)
      .filter(([category]) => !DEFAULT_ON_CATEGORIES.includes(category))
      .flatMap(([_, items]: [string, string[]]) => items);

    const selectedCount = Array.from(selectedBlueprints).filter((blueprint) =>
      filteredBlueprints.includes(blueprint)
    ).length;

    return {
      total: filteredBlueprints.length,
      selected: selectedCount,
    };
  }, [selectedBlueprints]);

  const { total, selected } = getBlueprintCounts();

  // Render loading skeleton
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-white/70 animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-[#e8e8e8] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 text-[#00c6ff] px-4 py-3 rounded-xl font-semibold transition-all hover:bg-[#00c6ff]/10 hover:border-[#00c6ff]/30 hover:-translate-y-0.5 mb-6"
        >
          ← Back
        </Link>

        {/* Profile Card */}
        <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 mb-6 relative overflow-hidden">
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

            {/* Trial Status (conditional) */}
            {userProfile?.hub_trial && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
                <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">
                  Trial Status
                </div>
                <div>
                  {loadingState.profile ? (
                    <div className="w-32 h-7 bg-white/10 animate-pulse rounded-full"></div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                        userProfile.trial_expiration &&
                        new Date(userProfile.trial_expiration) > new Date()
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {userProfile.trial_expiration &&
                      new Date(userProfile.trial_expiration) > new Date()
                        ? `Trial Active (Expires: ${formatDate(
                            userProfile.trial_expiration
                          )})`
                        : "Trial Expired"}
                    </span>
                  )}
                </div>
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
        <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 relative overflow-hidden">
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
              Select the blueprints you own. These will appear in the Crafting
              Calculator and help optimize your gameplay experience.
            </p>
          </div>

          {/* Loading, Error, and Content States */}
          {loadingState.profile || loadingState.blueprints ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <LoadingSpinner size="lg" />
              <p className="text-white/70 animate-pulse">
                Loading blueprints...
              </p>
              {isSlowConn && (
                <p className="text-yellow-400/80 text-sm text-center max-w-md">
                  Slow connection detected. This might take a moment...
                </p>
              )}
            </div>
          ) : errorState.profile || errorState.blueprints ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-center mb-8">
              {errorState.profile || errorState.blueprints}
              <button
                onClick={() => {
                  setErrorState({
                    profile: null,
                    blueprints: null,
                    saving: null,
                  });
                  setLoadingState({
                    profile: true,
                    blueprints: true,
                    saving: false,
                  });
                  loadUserData(true);
                }}
                className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Blueprint Categories */}
              <div className="space-y-4 mb-8">
                {Object.entries(itemsByCategory).map(([category, items]) => {
                  const isDefaultCategory =
                    DEFAULT_ON_CATEGORIES.includes(category);

                  return (
                    <details
                      key={category}
                      className="group bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden"
                    >
                      <summary className="flex items-center justify-between p-5 cursor-pointer bg-white/[0.03] font-semibold text-white hover:bg-white/[0.05] transition-all">
                        {category}
                        <span className="text-[#00c6ff] text-sm transition-transform duration-300 group-open:rotate-180">
                          ▼
                        </span>
                      </summary>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-lg hover:bg-white/[0.04] hover:border-[#00c6ff]/20 transition-all"
                          >
                            <div className="text-[#e8e8e8] text-sm font-medium pr-4 break-words">
                              {item}
                            </div>

                            <label className="relative inline-block w-13 h-7 flex-shrink-0">
                              <input
                                type="checkbox"
                                className="opacity-0 w-0 h-0"
                                checked={
                                  selectedBlueprints.has(item) ||
                                  isDefaultCategory
                                }
                                onChange={() => handleBlueprintToggle(item)}
                                disabled={isDefaultCategory}
                              />
                              <span
                                className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 ${
                                  selectedBlueprints.has(item) ||
                                  isDefaultCategory
                                    ? "bg-gradient-to-r from-[#00c6ff] to-[#0072ff] border-[#00c6ff]"
                                    : "bg-white/10 border-white/20"
                                } rounded-full border transition-all duration-300`}
                              >
                                <span
                                  className={`absolute w-5 h-5 bg-white rounded-full top-1 left-1 transition-transform duration-300 ${
                                    selectedBlueprints.has(item) ||
                                    isDefaultCategory
                                      ? "translate-x-6"
                                      : ""
                                  }`}
                                />
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>

              {/* Save Button and Status */}
              <div className="flex flex-col items-center">
                {saveStatus.type && (
                  <div
                    className={`mb-4 py-3 px-6 rounded-lg text-center ${
                      saveStatus.type === "success"
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                    }`}
                  >
                    {saveStatus.message}
                  </div>
                )}

                <button
                  onClick={saveBlueprints}
                  disabled={loadingState.saving}
                  className="bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white border-none py-4 px-8 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative"
                >
                  {loadingState.saving ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </span>
                  ) : (
                    "Save Blueprint Selection"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
