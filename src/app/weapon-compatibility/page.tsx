"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useAuth } from "@/hooks/useAuth";

// Types
interface WeaponData {
  weapon: string;
  ammo: string;
  fireModes: string;
  attachments: string;
  type: string;
}

interface FireMode {
  key: string;
  angle: number;
  label: string;
  description: string;
  cssClass: string;
}

// Constants
const WEAPON_TYPES = {
  PISTOL: "pistol",
  SHOTGUN: "shotgun",
  SUBMACHINE: "submachine",
  ASSAULT: "assault",
  SNIPER: "sniper",
  MACHINE_GUN: "machine-gun",
};

const FIRE_MODES: Record<string, FireMode> = {
  SAFE: {
    key: "safe",
    angle: 0,
    label: "SAFE",
    description: "All weapons shown",
    cssClass: "mode-safe",
  },
  SEMI: {
    key: "semi",
    angle: 90,
    label: "SEMI",
    description: "Semi-automatic only",
    cssClass: "mode-semi",
  },
  BURST: {
    key: "burst",
    angle: 180,
    label: "BURST",
    description: "Burst fire capable",
    cssClass: "mode-burst",
  },
  FULL: {
    key: "full",
    angle: 270,
    label: "FULL",
    description: "Full-auto capable",
    cssClass: "mode-full",
  },
};

const FIRE_MODE_CSS_CLASSES = {
  safe: "text-white",
  semi: "text-green-400",
  burst: "text-yellow-400",
  full: "text-red-400",
  auto: "text-red-400",
};

const VIEW_MODES = {
  ALL: "all",
  AMMO: "ammo",
  ATTACHMENTS: "attachments",
};

export default function WeaponCompatibilityPage() {
  usePageTracking();
  const { hasAccess, loading, user } = useAuth();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [currentFireMode, setCurrentFireMode] = useState<string>(
    FIRE_MODES.SAFE.key
  );
  const [currentView, setCurrentView] = useState(VIEW_MODES.ALL);
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(
    new Set()
  );
  const [allAttachmentsSelected, setAllAttachmentsSelected] = useState(true);
  const [filteredWeapons, setFilteredWeapons] = useState<WeaponData[]>([]);

  // Refs
  const selectorPointerRef = useRef<HTMLDivElement>(null);
  const currentModeRef = useRef<HTMLDivElement>(null);
  const modeDescriptionRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize weapon data
  const weaponData = useRef<WeaponData[]>([
    // Pistols
    {
      weapon: "Colt 1911",
      ammo: "8rnd .45 ACP",
      fireModes: "Semi",
      attachments: "None",
      type: WEAPON_TYPES.PISTOL,
    },
    {
      weapon: "Desert Eagle",
      ammo: ".50 AE 7rnd Mag",
      fireModes: "Semi",
      attachments: "None",
      type: WEAPON_TYPES.PISTOL,
    },
    {
      weapon: "M9",
      ammo: "9x19mm 15rnd M9 Mag",
      fireModes: "Semi",
      attachments: "None",
      type: WEAPON_TYPES.PISTOL,
    },
    {
      weapon: "PM",
      ammo: "9x18mm 8rnd PM Mag",
      fireModes: "Semi",
      attachments: "None",
      type: WEAPON_TYPES.PISTOL,
    },

    // Shotguns
    {
      weapon: "MP-43",
      ammo: "12/70 7mm Buckshot",
      fireModes: "Semi",
      attachments: "None",
      type: WEAPON_TYPES.SHOTGUN,
    },

    // Submachine Guns
    {
      weapon: "MP5A2",
      ammo: "30rnd 9x19 MP5 Mag",
      fireModes: "Full",
      attachments: "EOTECH XPS3, Leupold VX-6, Reflex scope",
      type: WEAPON_TYPES.SUBMACHINE,
    },
    {
      weapon: "MP7A2",
      ammo: "4.6x40 40rnd Mag",
      fireModes: "Semi, Full",
      attachments:
        "EOTECH XPS3, Reflex scope, Elcan Specter, and 4.7 mm Flash Hider",
      type: WEAPON_TYPES.SUBMACHINE,
    },

    // Assault Rifles
    {
      weapon: "AK-74",
      ammo: "7.62x39mm 30rnd AK Mag",
      fireModes: "Semi, Full",
      attachments: "6P20 Muzzle Brake",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "AKS-74U",
      ammo: "5.45x39mm 30rnd AK Mag OR 45rnd RPK-74 Tracer Mag",
      fireModes: "Semi, Full",
      attachments: "6P26 Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "M16 Carbine",
      ammo: "5.56x45mm 30rnd STANAG Mag",
      fireModes: "Semi, Full",
      attachments:
        "4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "M16A2",
      ammo: "5.56x45mm 30rnd STANAG Mag",
      fireModes: "Semi, Burst",
      attachments:
        "4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "M16A2 Auto",
      ammo: "5.56x45mm 30rnd STANAG Mag",
      fireModes: "Semi, Burst, Full",
      attachments:
        "4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "M416",
      ammo: "5.56x45mm 30rnd STANAG Mag",
      fireModes: "Semi, Full",
      attachments:
        "EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6 and A2 Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "Sa-58P",
      ammo: "7.62x39mm 30rnd Sa-58 Mag",
      fireModes: "Semi, Full",
      attachments: "None",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "Sa-58V",
      ammo: "7.62x39mm 30rnd Sa-58 Mag",
      fireModes: "Semi, Full",
      attachments: "None",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "ScarH",
      ammo: "7.62x51 FMJ 20rnd Mag",
      fireModes: "Semi, Full",
      attachments:
        "EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and 7.62x51mm Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "SIG MCX",
      ammo: ".300 Blackout Mag",
      fireModes: "Semi, Full",
      attachments:
        "EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and A2 Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "SIG MCX SPEAR",
      ammo: "6.8x51mm 25rnd Mag",
      fireModes: "Semi, Full",
      attachments: "Leupold VX-6, 6.8x51mm Flash Hider",
      type: WEAPON_TYPES.ASSAULT,
    },
    {
      weapon: "Steyr AUG",
      ammo: "5.56x45 30rnd AUG Mag",
      fireModes: "Semi, Full",
      attachments: "EOTECH XPS3, Reflex scope, Elcan Specter, and Leupold VX-6",
      type: WEAPON_TYPES.ASSAULT,
    },

    // Sniper Rifles
    {
      weapon: "M21 SWS",
      ammo: "7.62x51mm 20rnd M14 Mag",
      fireModes: "Semi",
      attachments: "ART II Scope",
      type: WEAPON_TYPES.SNIPER,
    },
    {
      weapon: "SR25",
      ammo: "7.62x51 30rnd Mag",
      fireModes: "Semi",
      attachments:
        "EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and 7.62x51mm Flash Hider",
      type: WEAPON_TYPES.SNIPER,
    },
    {
      weapon: "SSG",
      ammo: "5rnd .338 FMJ",
      fireModes: "Semi",
      attachments: "ART II Scope",
      type: WEAPON_TYPES.SNIPER,
    },
    {
      weapon: "SVD",
      ammo: "7.62x54mmR 10rnd SVD Mag",
      fireModes: "Semi",
      attachments: "PSO-1 Scope",
      type: WEAPON_TYPES.SNIPER,
    },

    // Machine Guns
    {
      weapon: "M249 SAW",
      ammo: "5.56x45mm 200rnd M249 Belt",
      fireModes: "Full",
      attachments: "None",
      type: WEAPON_TYPES.MACHINE_GUN,
    },
    {
      weapon: "PKM",
      ammo: "7.62x54mmR 100rnd PK Belt",
      fireModes: "Full",
      attachments: "None",
      type: WEAPON_TYPES.MACHINE_GUN,
    },
    {
      weapon: "RPK-74",
      ammo: "5.45x39mm 45rnd RPK-74 Tracer Mag",
      fireModes: "Full",
      attachments: "None",
      type: WEAPON_TYPES.MACHINE_GUN,
    },
  ]).current;

  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = "/";
    }
  }, [hasAccess, loading]);

  // Filter weapons based on current state
  const filterWeapons = useCallback(() => {
    const filtered = weaponData.filter((weapon) => {
      // Type filter
      const matchesType =
        selectedTypes.size === 0 || selectedTypes.has(weapon.type);

      // Search filter
      const matchesSearch =
        !searchTerm ||
        weapon.weapon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        weapon.ammo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        weapon.attachments.toLowerCase().includes(searchTerm.toLowerCase());

      // Fire mode filter
      const matchesFireMode =
        currentFireMode === "safe" ||
        weapon.fireModes.toLowerCase().includes(currentFireMode);

      // Attachment filter
      const matchesAttachment =
        allAttachmentsSelected ||
        selectedAttachments.size === 0 ||
        Array.from(selectedAttachments).some((attachment) =>
          weapon.attachments.toLowerCase().includes(attachment)
        );

      return (
        matchesType && matchesSearch && matchesFireMode && matchesAttachment
      );
    });

    setFilteredWeapons(filtered);
  }, [
    weaponData,
    selectedTypes,
    searchTerm,
    currentFireMode,
    allAttachmentsSelected,
    selectedAttachments,
  ]);

  // Update filtered weapons when filters change
  useEffect(() => {
    filterWeapons();
  }, [filterWeapons]);

  // Update fire selector UI
  const updateFireSelector = useCallback((mode: string) => {
    const modeData = Object.values(FIRE_MODES).find((m) => m.key === mode);
    if (!modeData) return;

    if (selectorPointerRef.current) {
      selectorPointerRef.current.style.transform = `translateX(-50%) rotate(${modeData.angle}deg)`;
    }

    if (currentModeRef.current) {
      currentModeRef.current.textContent = modeData.label;
      currentModeRef.current.className = `text-xl font-bold mb-1 ${
        mode === "safe"
          ? "text-white"
          : mode === "semi"
          ? "text-green-400"
          : mode === "burst"
          ? "text-yellow-400"
          : "text-red-400"
      }`;
    }

    if (modeDescriptionRef.current) {
      modeDescriptionRef.current.textContent = modeData.description;
    }

    setCurrentFireMode(mode);
  }, []);

  // Handle fire selector click
  const handleFireSelectorClick = useCallback(() => {
    const modes = Object.values(FIRE_MODES);
    const currentIndex = modes.findIndex(
      (mode) => mode.key === currentFireMode
    );
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateFireSelector(nextMode.key);
  }, [currentFireMode, updateFireSelector]);

  // Handle filter button click
  const handleFilterButtonClick = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // Handle view toggle click
  const handleViewToggleClick = useCallback((view: string) => {
    setCurrentView(view);
  }, []);

  // Handle attachment checkbox change
  const handleAttachmentChange = useCallback(
    (value: string, checked: boolean) => {
      if (value === "all") {
        setAllAttachmentsSelected(checked);
        setSelectedAttachments(new Set());
      } else {
        setAllAttachmentsSelected(false);

        setSelectedAttachments((prev) => {
          const newSet = new Set(prev);
          if (checked) {
            newSet.add(value.toLowerCase());
          } else {
            newSet.delete(value.toLowerCase());
          }

          // If no attachments selected, select all
          if (newSet.size === 0) {
            setAllAttachmentsSelected(true);
          }

          return newSet;
        });
      }
    },
    []
  );

  // Handle search input with debouncing
  const handleSearchInput = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value.trim().toLowerCase());
    }, 300);
  }, []);

  // Generate HTML for fire mode badges
  const generateFireModeHTML = useCallback((fireModes: string) => {
    return fireModes
      .split(",")
      .map((mode) => {
        const cleanMode = mode.trim().toLowerCase();
        const cssClass =
          FIRE_MODE_CSS_CLASSES[
            cleanMode as keyof typeof FIRE_MODE_CSS_CLASSES
          ] || "";
        return `<span class="${cssClass}">${mode.trim()}</span>`;
      })
      .join(", ");
  }, []);

  // Escape HTML to prevent XSS
  const escapeHtml = useCallback((text: string) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }, []);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[#00c6ff] mb-2">
            Weapon Compatibility Viewer
          </h1>
          <p className="text-[#888] text-lg">
            Comprehensive firearm specifications and attachment compatibility
          </p>
        </div>

        <div className="bg-[#111] rounded-xl border border-[#333] p-6 md:p-8 mb-8 space-y-6">
          {/* Search Section */}
          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="search"
              className="text-[#00c6ff] font-semibold text-lg flex items-center"
            >
              Search Weapons
            </label>
            <input
              type="text"
              id="search"
              className="p-3 md:p-4 bg-[#1a1a1a] border-2 border-[#333] rounded-lg text-white focus:outline-none focus:border-[#00c6ff] focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
              placeholder="Search by weapon name, ammo type, or attachments..."
              onChange={(e) => handleSearchInput(e.target.value)}
            />
          </div>

          {/* Weapon Categories */}
          <div className="flex flex-col gap-4">
            <div className="text-[#00c6ff] font-semibold text-lg flex items-center before:content-[''] before:w-1 before:h-4 before:bg-[#00c6ff] before:rounded before:mr-2">
              Weapon Categories
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                className={`px-4 py-2 bg-[#1a1a1a] border-2 ${
                  selectedTypes.has(WEAPON_TYPES.PISTOL)
                    ? "bg-[#00c6ff] text-black border-[#00c6ff]"
                    : "border-[#333] text-[#e0e0e0] hover:border-[#00c6ff] hover:bg-[rgba(0,198,255,0.1)]"
                } rounded-full text-sm font-medium transition-all`}
                onClick={() => handleFilterButtonClick(WEAPON_TYPES.PISTOL)}
              >
                Pistols
              </button>
              <button
                className={`px-4 py-2 bg-[#1a1a1a] border-2 ${
                  selectedTypes.has(WEAPON_TYPES.SHOTGUN)
                    ? "bg-[#00c6ff] text-black border-[#00c6ff]"
                    : "border-[#333] text-[#e0e0e0] hover:border-[#00c6ff] hover:bg-[rgba(0,198,255,0.1)]"
                } rounded-full text-sm font-medium transition-all`}
                onClick={() => handleFilterButtonClick(WEAPON_TYPES.SHOTGUN)}
              >
                Shotguns
              </button>
              <button
                className={`px-4 py-2 bg-[#1a1a1a] border-2 ${
                  selectedTypes.has(WEAPON_TYPES.SUBMACHINE)
                    ? "bg-[#00c6ff] text-black border-[#00c6ff]"
                    : "border-[#333] text-[#e0e0e0] hover:border-[#00c6ff] hover:bg-[rgba(0,198,255,0.1)]"
                } rounded-full text-sm font-medium transition-all`}
                onClick={() => handleFilterButtonClick(WEAPON_TYPES.SUBMACHINE)}
              >
                SMGs
              </button>
              <button
                className={`px-4 py-2 bg-[#1a1a1a] border-2 ${
                  selectedTypes.has(WEAPON_TYPES.ASSAULT)
                    ? "bg-[#00c6ff] text-black border-[#00c6ff]"
                    : "border-[#333] text-[#e0e0e0] hover:border-[#00c6ff] hover:bg-[rgba(0,198,255,0.1)]"
                } rounded-full text-sm font-medium transition-all`}
                onClick={() => handleFilterButtonClick(WEAPON_TYPES.ASSAULT)}
              >
                Assault Rifles
              </button>
              <button
                className={`px-4 py-2 bg-[#1a1a1a] border-2 ${
                  selectedTypes.has(WEAPON_TYPES.SNIPER)
                    ? "bg-[#00c6ff] text-black border-[#00c6ff]"
                    : "border-[#333] text-[#e0e0e0] hover:border-[#00c6ff] hover:bg-[rgba(0,198,255,0.1)]"
                } rounded-full text-sm font-medium transition-all`}
                onClick={() => handleFilterButtonClick(WEAPON_TYPES.SNIPER)}
              >
                Sniper Rifles
              </button>
              <button
                className={`px-4 py-2 bg-[#1a1a1a] border-2 ${
                  selectedTypes.has(WEAPON_TYPES.MACHINE_GUN)
                    ? "bg-[#00c6ff] text-black border-[#00c6ff]"
                    : "border-[#333] text-[#e0e0e0] hover:border-[#00c6ff] hover:bg-[rgba(0,198,255,0.1)]"
                } rounded-full text-sm font-medium transition-all`}
                onClick={() =>
                  handleFilterButtonClick(WEAPON_TYPES.MACHINE_GUN)
                }
              >
                Machine Guns
              </button>
            </div>
          </div>

          {/* Fire Mode Selector */}
          <div className="flex flex-col gap-4">
            <div className="text-[#00c6ff] font-semibold text-lg flex items-center before:content-[''] before:w-1 before:h-4 before:bg-[#00c6ff] before:rounded before:mr-2">
              Fire Mode Selector
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div
                className="relative w-[120px] h-[120px] md:w-[120px] md:h-[120px] rounded-full border-3 border-[#333] shadow-inner bg-[radial-gradient(circle,#2a2a2a_0%,#1a1a1a_70%)] cursor-pointer"
                onClick={handleFireSelectorClick}
              >
                {/* Inner circle */}
                <div className="absolute top-1/2 left-1/2 w-[80px] h-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#333_0%,#222_100%)] shadow-inner"></div>

                {/* Selector pointer */}
                <div
                  ref={selectorPointerRef}
                  className="absolute top-[10px] left-1/2 w-1 h-[25px] bg-gradient-to-b from-[#ff4444] to-[#cc0000] -translate-x-1/2 rounded-sm shadow-md transition-transform duration-300"
                  style={{ transformOrigin: "center 50px" }}
                ></div>

                {/* Mode labels */}
                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 text-xs font-bold text-white text-shadow">
                  SAFE
                </div>
                <div className="absolute top-1/2 right-[6px] -translate-y-1/2 text-xs font-bold text-green-400 text-shadow">
                  SEMI
                </div>
                <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 text-xs font-bold text-yellow-400 text-shadow">
                  BURST
                </div>
                <div className="absolute top-1/2 left-[6px] -translate-y-1/2 text-xs font-bold text-red-400 text-shadow">
                  FULL
                </div>

                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#444] rounded-full -translate-x-1/2 -translate-y-1/2 z-10 shadow-inner"></div>
              </div>

              <div className="bg-[#1a1a1a] p-4 rounded-lg border-2 border-[#333] min-w-[120px] text-center">
                <div
                  ref={currentModeRef}
                  className="text-xl font-bold mb-1 text-white"
                >
                  SAFE
                </div>
                <div ref={modeDescriptionRef} className="text-sm text-[#888]">
                  All weapons shown
                </div>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div className="flex flex-col gap-4">
            <div className="text-[#00c6ff] font-semibold text-lg flex items-center before:content-[''] before:w-1 before:h-4 before:bg-[#00c6ff] before:rounded before:mr-2">
              Display Options
            </div>
            <div className="flex bg-[#1a1a1a] rounded-lg border border-[#333] p-1">
              <button
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  currentView === VIEW_MODES.ALL
                    ? "bg-[#00c6ff] text-black"
                    : "text-[#e0e0e0] hover:bg-[rgba(0,198,255,0.1)]"
                }`}
                onClick={() => handleViewToggleClick(VIEW_MODES.ALL)}
              >
                All Info
              </button>
              <button
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  currentView === VIEW_MODES.AMMO
                    ? "bg-[#00c6ff] text-black"
                    : "text-[#e0e0e0] hover:bg-[rgba(0,198,255,0.1)]"
                }`}
                onClick={() => handleViewToggleClick(VIEW_MODES.AMMO)}
              >
                Hide Ammo
              </button>
              <button
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  currentView === VIEW_MODES.ATTACHMENTS
                    ? "bg-[#00c6ff] text-black"
                    : "text-[#e0e0e0] hover:bg-[rgba(0,198,255,0.1)]"
                }`}
                onClick={() => handleViewToggleClick(VIEW_MODES.ATTACHMENTS)}
              >
                Hide Attachments
              </button>
            </div>
          </div>

          {/* Attachment Filters */}
          <div className="flex flex-col gap-4">
            <div className="text-[#00c6ff] font-semibold text-lg flex items-center before:content-[''] before:w-1 before:h-4 before:bg-[#00c6ff] before:rounded before:mr-2">
              Attachment Filters
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* General */}
              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="all-attachments"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="all"
                  checked={allAttachmentsSelected}
                  onChange={(e) =>
                    handleAttachmentChange("all", e.target.checked)
                  }
                  style={{
                    backgroundImage: allAttachmentsSelected
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="all-attachments"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  All Attachments
                </label>
              </div>

              {/* Optics / Sights */}
              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="red-dot"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="red dot"
                  checked={selectedAttachments.has("red dot")}
                  onChange={(e) =>
                    handleAttachmentChange("red dot", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("red dot")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="red-dot"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  Red Dot
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="reflex"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="reflex"
                  checked={selectedAttachments.has("reflex")}
                  onChange={(e) =>
                    handleAttachmentChange("reflex", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("reflex")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="reflex"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  Reflex
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="eotech"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="eotech"
                  checked={selectedAttachments.has("eotech")}
                  onChange={(e) =>
                    handleAttachmentChange("eotech", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("eotech")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="eotech"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  EOTECH
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="elcan"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="elcan"
                  checked={selectedAttachments.has("elcan")}
                  onChange={(e) =>
                    handleAttachmentChange("elcan", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("elcan")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="elcan"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  Elcan
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="leupold"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="leupold"
                  checked={selectedAttachments.has("leupold")}
                  onChange={(e) =>
                    handleAttachmentChange("leupold", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("leupold")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="leupold"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  Leupold
                </label>
              </div>

              {/* Scopes */}
              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="art-scope"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="art"
                  checked={selectedAttachments.has("art")}
                  onChange={(e) =>
                    handleAttachmentChange("art", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("art")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="art-scope"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  ART Scope
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="pso-1"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="pso-1"
                  checked={selectedAttachments.has("pso-1")}
                  onChange={(e) =>
                    handleAttachmentChange("pso-1", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("pso-1")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="pso-1"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  PSO-1 Scope
                </label>
              </div>

              {/* Carry Handle */}
              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="carry-handle"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="carry handle"
                  checked={selectedAttachments.has("carry handle")}
                  onChange={(e) =>
                    handleAttachmentChange("carry handle", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("carry handle")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="carry-handle"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  Carry Handle
                </label>
              </div>

              {/* Muzzle Attachments */}
              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="flash-4-7"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="4.7 mm flash hider"
                  checked={selectedAttachments.has("4.7 mm flash hider")}
                  onChange={(e) =>
                    handleAttachmentChange(
                      "4.7 mm flash hider",
                      e.target.checked
                    )
                  }
                  style={{
                    backgroundImage: selectedAttachments.has(
                      "4.7 mm flash hider"
                    )
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="flash-4-7"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  4.77mm Flash Hider
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="a2-flash"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="a2 flash hider"
                  checked={selectedAttachments.has("a2 flash hider")}
                  onChange={(e) =>
                    handleAttachmentChange("a2 flash hider", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("a2 flash hider")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="a2-flash"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  A2 Flash Hider
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="flash-6-8"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="6.8x51mm flash hider"
                  checked={selectedAttachments.has("6.8x51mm flash hider")}
                  onChange={(e) =>
                    handleAttachmentChange(
                      "6.8x51mm flash hider",
                      e.target.checked
                    )
                  }
                  style={{
                    backgroundImage: selectedAttachments.has(
                      "6.8x51mm flash hider"
                    )
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="flash-6-8"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  6.8x51mm Flash Hider
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="flash-6p26"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="6p26 flash hider"
                  checked={selectedAttachments.has("6p26 flash hider")}
                  onChange={(e) =>
                    handleAttachmentChange("6p26 flash hider", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("6p26 flash hider")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="flash-6p26"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  6P26 Flash Hider
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="flash-7-62"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="7.62x51mm flash hider"
                  checked={selectedAttachments.has("7.62x51mm flash hider")}
                  onChange={(e) =>
                    handleAttachmentChange(
                      "7.62x51mm flash hider",
                      e.target.checked
                    )
                  }
                  style={{
                    backgroundImage: selectedAttachments.has(
                      "7.62x51mm flash hider"
                    )
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="flash-7-62"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  7.62x51mm Flash Hider
                </label>
              </div>

              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="muzzle-6p20"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="6p20 muzzle brake"
                  checked={selectedAttachments.has("6p20 muzzle brake")}
                  onChange={(e) =>
                    handleAttachmentChange(
                      "6p20 muzzle brake",
                      e.target.checked
                    )
                  }
                  style={{
                    backgroundImage: selectedAttachments.has(
                      "6p20 muzzle brake"
                    )
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="muzzle-6p20"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  6P20 Muzzle Brake
                </label>
              </div>

              {/* None */}
              <div className="flex items-center gap-2 cursor-pointer py-1.5">
                <input
                  type="checkbox"
                  id="none"
                  className="w-[18px] h-[18px] appearance-none border-2 border-[#333] rounded bg-[#1a1a1a] relative cursor-pointer checked:bg-[#00c6ff] checked:border-[#00c6ff] transition-all"
                  value="none"
                  checked={selectedAttachments.has("none")}
                  onChange={(e) =>
                    handleAttachmentChange("none", e.target.checked)
                  }
                  style={{
                    backgroundImage: selectedAttachments.has("none")
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E")`
                      : "none",
                    backgroundSize: "70%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label
                  htmlFor="none"
                  className="text-[#e0e0e0] text-sm cursor-pointer"
                >
                  None
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col md:flex-row justify-center gap-8 mb-6 p-5 bg-[#111] rounded-lg border border-[#333]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c6ff]">
              {weaponData.length}
            </div>
            <div className="text-sm text-[#888] mt-1">Total Weapons</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c6ff]">
              {filteredWeapons.length}
            </div>
            <div className="text-sm text-[#888] mt-1">Showing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c6ff]">6</div>
            <div className="text-sm text-[#888] mt-1">Categories</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#111] rounded-xl overflow-hidden border border-[#333] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a] sticky top-0 z-10">
                <tr>
                  <th className="p-4 md:p-5 text-left text-[#00c6ff] font-semibold text-base border-b-2 border-[#333] whitespace-nowrap">
                    Weapon
                  </th>
                  <th
                    className={`p-4 md:p-5 text-left text-[#00c6ff] font-semibold text-base border-b-2 border-[#333] whitespace-nowrap ${
                      currentView === VIEW_MODES.AMMO ? "hidden" : ""
                    }`}
                  >
                    Ammunition
                  </th>
                  <th className="p-4 md:p-5 text-left text-[#00c6ff] font-semibold text-base border-b-2 border-[#333] whitespace-nowrap">
                    Fire Modes
                  </th>
                  <th
                    className={`p-4 md:p-5 text-left text-[#00c6ff] font-semibold text-base border-b-2 border-[#333] whitespace-nowrap ${
                      currentView === VIEW_MODES.ATTACHMENTS ? "hidden" : ""
                    }`}
                  >
                    Attachments
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWeapons.length > 0 ? (
                  filteredWeapons.map((weapon, index) => (
                    <tr
                      key={index}
                      className="border-b border-[#222] last:border-b-0 hover:bg-[rgba(0,198,255,0.05)] transition-colors animate-fadeIn"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="p-4 md:p-5 font-semibold text-white">
                        {weapon.weapon}
                      </td>
                      <td
                        className={`p-4 md:p-5 text-[#ccc] font-mono text-sm ${
                          currentView === VIEW_MODES.AMMO ? "hidden" : ""
                        }`}
                      >
                        {weapon.ammo}
                      </td>
                      <td className="p-4 md:p-5 font-medium">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: weapon.fireModes
                              .split(",")
                              .map((mode) => {
                                const cleanMode = mode.trim().toLowerCase();
                                const cssClass =
                                  FIRE_MODE_CSS_CLASSES[
                                    cleanMode as keyof typeof FIRE_MODE_CSS_CLASSES
                                  ] || "";
                                return `<span class="${cssClass}">${mode.trim()}</span>`;
                              })
                              .join(", "),
                          }}
                        />
                      </td>
                      <td
                        className={`p-4 md:p-5 text-white text-sm max-w-[200px] break-words ${
                          currentView === VIEW_MODES.ATTACHMENTS ? "hidden" : ""
                        }`}
                      >
                        {weapon.attachments}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-10 text-center text-[#888] text-lg"
                    >
                      No weapons match your current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Text shadow for selector labels */
        .text-shadow {
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        /* Animation for table rows */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease forwards;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: #00c6ff;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #33d1ff;
        }
      `}</style>
    </div>
  );
}