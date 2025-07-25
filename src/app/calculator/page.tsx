"use client";

import { usePageTracking } from "@/hooks/usePageTracking";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles } from "lucide-react";

// Types
interface ItemComponents {
  [category: string]: {
    [itemName: string]: {
      HQ?: { [component: string]: number };
      "Non-HQ"?: { [component: string]: number };
      Resources?: { [resource: string]: number };
    };
  };
}

interface ComponentResources {
  [componentName: string]: { [resource: string]: number };
}

interface StorageOptions {
  vehicles: { [name: string]: number | { canisters: number } };
  backpacks: { [name: string]: number };
}

interface KitItem {
  category: string;
  item: string;
  quantity: number;
}

interface ItemsByCategory {
  [key: string]: string[];
}

interface CalculationResults {
  resources: { [key: string]: number };
  components: { [key: string]: number };
  hqComponents: { [key: string]: number };
  hqBreakdown: { [key: string]: { [key: string]: number } };
  nonHQBreakdown: { [key: string]: { [key: string]: number } };
  materialRuns: {
    fuelTruckRuns?: {
      runDetails: { [key: string]: number };
      totalRuns: number;
      totalResources: number;
      totalCap: number;
      vehicle: string;
      backpack: string;
    };
    cargoTruckRuns?: {
      runDetails: { [key: string]: number };
      totalRuns: number;
      totalResources: number;
      totalCap: number;
      vehicle: string;
      backpack: string;
    };
    transportRequirements: {
      needsFuelTruck: boolean;
      needsCargoTruck: boolean;
      fuelResources: string[];
      cargoResources: string[];
    };
  };
  craftingTime?: {
    totalTime: number;
    breakdown: {
      name: string;
      count: number;
      timePerUnit: number;
      total: number;
    }[];
  };
}

export default function CalculatorPage() {
  usePageTracking();
  const { hasAccess, loading, user } = useAuth();
  const supabase = createClient();

  // State
  const [selectedCategory, setSelectedCategory] = useState("--");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showAllBlueprints, setShowAllBlueprints] = useState(true);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  const [selectedFuelVehicle, setSelectedFuelVehicle] = useState("");
  const [selectedCargoVehicle, setSelectedCargoVehicle] = useState("");
  const [selectedBackpack, setSelectedBackpack] = useState("");
  const [kit, setKit] = useState<KitItem[]>([]);
  const [showKitSidebar, setShowKitSidebar] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [results, setResults] = useState<CalculationResults | null>(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  // Constants
  const ONBOARDING_COMPLETED_KEY = "calculator_onboarding_completed";

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
          const element = document.querySelector(
            `[data-tour="${step.target}"]`
          );
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

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 10) left = 10;
      if (left + tooltipWidth > viewportWidth - 10)
        left = viewportWidth - tooltipWidth - 10;
      if (top < 10) top = 10;
      if (top + tooltipHeight > viewportHeight - 10)
        top = viewportHeight - tooltipHeight - 10;

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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
          onClick={onSkip}
        />

        {/* Highlight ring */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
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
  // TOUR STEPS CONFIGURATION FOR CRAFTING CALCULATOR
  // ============================================================================

  const CALCULATOR_TOUR_STEPS: TooltipStep[] = [
    {
      id: "calculator-header",
      target: "calculator-header",
      title: "Welcome to the Crafting Calculator!",
      content:
        "This powerful tool helps you calculate exactly what resources and components you need for any crafting project in ELAN Life.",
      placement: "bottom",
    },
    {
      id: "show-all-toggle",
      target: "show-all-toggle",
      title: "Blueprint Filter Toggle",
      content:
        "Toggle this ON to see all available blueprints, or keep it OFF to only see blueprints you own (set in your profile).",
      placement: "bottom",
    },
    {
      id: "category-selector",
      target: "category-selector",
      title: "Category Selection",
      content:
        "Start by choosing a category like Weapons, Vehicles, or Components. This filters the available items.",
      placement: "bottom",
    },
    {
      id: "item-selector",
      target: "item-selector",
      title: "Item Selection",
      content:
        "Pick the specific item you want to craft. You can see the required crafting level here too!",
      placement: "bottom",
    },
    {
      id: "quantity-input",
      target: "quantity-input",
      title: "Set Quantity",
      content:
        "Enter how many of this item you want to craft. The calculator will multiply all requirements automatically.",
      placement: "left",
    },
    {
      id: "storage-options",
      target: "storage-options",
      title: "Transport Planning",
      content:
        "Select your vehicles and backpack to calculate how many material runs you'll need to gather resources.",
      placement: "top",
    },
    {
      id: "calculate-button",
      target: "calculate-button",
      title: "Calculate Materials",
      content:
        "Click here to see all required resources, components, and material run calculations for your selected item.",
      placement: "top",
    },
    {
      id: "kit-system",
      target: "kit-system",
      title: "Kit Building System",
      content:
        "Add multiple items to your kit to calculate materials for entire projects! Perfect for planning major crafting sessions.",
      placement: "left",
    },
  ];

  // Type definitions
  interface ItemsByCategory {
    [category: string]: string[];
  }

  interface StorageOptions {
    vehicles: {
      [vehicleName: string]: number | { canisters: number };
    };
    backpacks: {
      [backpackName: string]: number;
    };
  }

  interface ComponentRequirement {
    [componentName: string]: number;
  }

  interface ItemComponentData {
    HQ?: ComponentRequirement;
    "Non-HQ"?: ComponentRequirement;
    Resources?: ComponentRequirement;
  }

  interface ItemComponents {
    [category: string]: {
      [itemName: string]: ItemComponentData;
    };
  }

  interface ComponentResources {
    [componentName: string]: ComponentRequirement;
  }

  interface CraftingLevels {
    [itemName: string]: number;
  }

  interface CraftingTimes {
    [itemName: string]: number;
  }

  // ============================================================================
  // !! ADD NEW ITEM DATA HERE
  // ============================================================================
  // Game data
  const itemsByCategory: ItemsByCategory = {
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

  // ============================================================================
  // !! ADD NEW ITEM DATA HERE
  // ============================================================================
  const craftingLevels: CraftingLevels = {
    // ========== WEAPONS ==========
    "AK-74": 8,
    "AKS-74U": 8,
    "CheyTac M200 Intervention": 13,
    "Colt 1911": 10,
    "Desert Eagle": 8,
    M16A2: 5,
    "M16A2 - AUTO": 6,
    "M16 Carbine": 6,
    "M21 SWS": 7,
    "M249 SAW": 11,
    M416: 7,
    M9: 3,
    "MP 43 1C": 8,
    MP5A2: 5,
    MP7A2: 5,
    PKM: 12,
    PM: 2,
    "RPK-74": 10,
    "Sa-58P": 9,
    "Sa-58V": 9,
    "Scar-H": 10,
    "SIG MCX": 7,
    "SIG MCX SPEAR": 10,
    "SSG10A2-Sniper": 10,
    "Steyr AUG": 6,
    "SR-25 Rifle": 10,
    SVD: 10,

    // ========== MAGAZINES ==========
    "30rnd 9x19 Mag": 5,
    "8rnd .45 ACP": 4,
    "9x18mm 8rnd PM Mag": 2,
    "9x19mm 15rnd M9 Mag": 3,
    ".300 Blackout Mag": 7,
    ".338 5rnd FMJ": 10,
    ".50 AE 7rnd Mag": 9,
    "12/70 7mm Buckshot": 7,
    "4.6x40 40rnd Mag": 5,
    "5.45x39mm 30rnd AK Mag": 8,
    "5.45x39mm 45rnd RPK-74 Tracer Mag": 10,
    "5.56x45mm 30rnd AUG Mag": 6,
    "5.56x45mm 30rnd STANAG Mag": 5,
    "5.56x45mm 200rnd M249 Belt": 11,
    "7Rnd M200 Magazine": 10,
    "7.62x39mm 30rnd Sa-58 Mag": 9,
    "7.62x51mm FMJ": 11,
    "7.62x51mm 20rnd M14 Mag": 7,
    "7.62x51mm 30rnd Mag": 11,
    "SR25 7.62x51mm 20rnd": 11,
    "7.62x54mmR 100rnd PK Belt": 12,
    "7.62x54mmR 10rnd SVD Sniper Mag": 10,
    "SPEAR 6.8x51 25rnd": 9,

    // ========== ATTACHMENTS ==========
    "4x20 Carry Handle Scope": 5,
    "4.7mm FlashHider": 2,
    "6.8x51mm FlashHider": 4,
    "6P20 Muzzle Brake": 4,
    "6P26 Flash Hider": 4,
    "7.62x51mm FlashHider": 5,
    "A2 Flash Hider": 3,
    "ART II Scope": 7,
    "Carry Handle Red-Dot-Sight": 7,
    "EOTECH XPS3": 3,
    "Elcan Specter": 7,
    "Leupold VX-6": 10,
    "PSO-1 Scope": 7,
    "Reflex Scope": 2,
    "Vortex RazorHD Gen2": 10,

    // ========== VEHICLES ==========
    "M1025 Light Armoured Vehicle": 7,
    "M151A2 Off-Road": 4,
    "M151A2 Off-Road Open Top": 4,
    "M923A1 Fuel Truck": 8,
    "M923A1 Transport Truck": 7,
    "M923A1 Transport Truck - Canopy": 8,
    "M998 Light Utility Vehicle": 6,
    "M998 Light Utility Vehicle - Canopy": 8,
    "Mi-8MT Transport Helicopter": 12,
    "Pickup-Truck": 7,
    "S105 Car": 4,
    "S1203 Minibus": 5,
    "S1203 - Laboratory": 5,
    "UAZ-452 Off-road": 5,
    "UAZ-452 Off-road - Laboratory": 8,
    "UAZ-469 Off-road": 3,
    "UAZ-469 Off-road - Open Top": 3,
    "UH-1H Transport Helicopter": 11,
    "Ural-4320 Fuel Truck": 9,
    "Ural-4320 Transport Truck": 9,
    "Ural-4320 Transport Truck - Canopy": 10,
    "Ural (Device)": 13,
    "VW Rolf": 7,

    // ========== VESTS ==========
    "6B2 Vest": 7,
    "6B3 Vest": 9,
    "M69 Vest": 7,
    "PASGT Vest": 7,
    "Plate Carrier": 10,
    "TTV110": 10,

    // ========== HELMETS ==========
    "PASGT Helmet": 4,
    "PASGT Helmet - Camouflaged": 4,
    "PASGT Helmet - Camouflaged Netting": 4,
    "SPH-4 Helmet": 6,
    "SSh-68 Helmet": 4,
    "SSh-68 Helmet - Camouflaged": 4,
    "SSh-68 Helmet - Cover": 4,
    "SSh-68 Helmet - KZS": 4,
    "SSh-68 Helmet - Netting": 4,
    "ZSh-5 Helmet": 6,

    // ========== CLOTHES ==========
    "ADA Assault Pack": 7,
    "ALICE Medium Backpack": 4,
    Bandana: 3,
    Balaclava: 3,
    "BDU Blouse": 2,
    "BDU Blouse - Rolled-up": 2,
    "BDU Trousers": 2,
    Beanie: 4,
    Beret: 3,
    Boonie: 4,
    "Cap - All Variants": 2,
    "Cargo Pants": 3,
    "Cargo Pants (Colored)": 4,
    Cardigan: 3,
    "Classic Shoe": 4,
    "Cotton Shirt": 3,
    "CWU-27 Pilot Coveralls": 6,
    Dress: 5,
    Fedora: 3,
    "Fisher Hat": 3,
    "Flat Cap": 3,
    "Half Mask": 3,
    "Hard Hat": 4,
    Hoodie: 4,
    "Hunting Vest": 3,
    "IIFS Large Combat Field Pack": 7,
    Jacket: 4,
    Jeans: 3,
    "Jeans (Colored)": 4,
    "Jungle Boots": 2,
    "KLMK Coveralls": 6,
    "Knit Cap": 1,
    "Kolobok Backpack": 2,
    "KZS Pants": 3,
    "Leather Jacket (old)": 4,
    "Lumber Jacket - All Variants": 4,
    "M70 Backpack": 5,
    "M70 Cap": 3,
    "M70 Parka": 3,
    "M70 Trousers": 3,
    "M88 Field Cap": 2,
    "M88 Jacket": 1,
    "M88 Jacket - Rolled-up": 1,
    "M88 Trousers": 1,
    "Mask (Medical)": 5,
    "Mask (Latex)": 5,
    "Mask (Ski)": 3,
    "Officer's Cap": 7,
    Panamka: 2,
    "Paper Bag": 5,
    Polo: 4,
    Pullover: 4,
    Raincoat: 4,
    Robe: 5,
    "Runner Shoe": 4,
    Sneaker: 4,
    "Soviet Combat Boots": 1,
    "Soviet Pilot Jacket": 6,
    "Soviet Pilot Pants": 6,
    "Suit Jacket": 7,
    "Suit Pants": 7,
    Sweater: 3,
    "Sweat Pants": 4,
    "Track Jacket": 4,
    "Track Pants": 4,
    TShirt: 4,
    "US Combat Boots": 1,
    "Veshmeshok Backpack": 3,
    "Wool Hat": 5,
  };

  const storageOptions: StorageOptions = {
    vehicles: {
      "M1025 Light Armored Vehicle": 18,
      "M151A2 Off-Road": 16,
      "M151A2 Off-Road - Open Top": 16,
      "M998 Light Utility Vehicle": 18,
      "M998 Light Utility Vehicle - Canopy": 18,
      "M923A1 Fuel Truck": { canisters: 53 },
      "M923A1 Transport Truck": 50,
      "M923A1 Transport Truck - Canopy": 83,
      "Pickup Truck": 18,
      "UAZ-452 Off-Road": 28,
      "UAZ-452 Off-Road - Banana": 28,
      "UAZ-469 Off-Road": 13,
      "UAZ-469 Off-Road - Open Top": 13,
      "Ural-4320 Fuel Truck": { canisters: 83 },
      "EVENT | Ural-4320 Fuel Truck": { canisters: 98 },
      "Ural-4320 Transport Truck": 100,
      "Ural-4320 Transport Truck - Canopy": 116,
      "EVENT | Ural-4320 Transport Truck - Canopy": 128,
      "VW Rolf": 18,
      "S105 Car": 18,
      "S1203 Minibus": 18,
      "MI8-MT Transport Helicopter": 26,
      "UH-1H Transport Helicopter": 26,
    },
    backpacks: {
      'ADA Assault Pack': 19,
      "ALICE Medium Backpack": 13,
      "IIFS Large Combat Field Pack": 19,
      "Kolobok Backpack": 10,
      "M70 Backpack": 8,
      "Veshmeshok Backpack": 6,
    },
  };

  // ============================================================================
  // !! ADD NEW ITEM DATA HERE
  // ============================================================================
  const itemComponents: ItemComponents = {
    Weapons: {
      "AK-74": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 2,
        },
      },
      "AKS-74U": {
        HQ: {
          "Weapon Part (HQ)": 1,
          "Stabilizer (HQ)": 1,
          "Attachment Part (HQ)": 1,
        },
      },
      "CheyTac M200 Intervention": {
        HQ: {
          "Weapon Part (HQ)": 4,
          "Stabilizer (HQ)": 4,
          "Attachment Part (HQ)": 5,
          "Special Gun Barrel": 1,
        },
      },
      "Colt 1911": {
        "Non-HQ": {
          "Weapon Part": 5,
          Stabilizer: 3,
          "Attachment Part": 3,
        },
      },
      "Desert Eagle": {
        "Non-HQ": {
          "Weapon Part": 13,
          Stabilizer: 7,
          "Attachment Part": 8,
        },
      },
      M16A2: {
        "Non-HQ": {
          "Weapon Part": 27,
          Stabilizer: 15,
          "Attachment Part": 17,
        },
      },
      "M16A2 - AUTO": {
        "Non-HQ": {
          "Weapon Part": 29,
          Stabilizer: 16,
          "Attachment Part": 18,
        },
      },
      "M16 Carbine": {
        "Non-HQ": {
          "Weapon Part": 29,
          Stabilizer: 16,
          "Attachment Part": 18,
        },
      },
      "M21 SWS": {
        "Non-HQ": {
          "Weapon Part": 39,
          Stabilizer: 21,
          "Attachment Part": 24,
        },
      },
      "M249 SAW": {
        HQ: {
          "Weapon Part (HQ)": 9,
          "Stabilizer (HQ)": 9,
          "Attachment Part (HQ)": 11,
          "Special Gun Barrel": 1,
        },
      },
      M416: {
        "Non-HQ": {
          "Weapon Part": 34,
          Stabilizer: 19,
          "Attachment Part": 21,
        },
      },
      M9: {
        "Non-HQ": {
          "Weapon Part": 5,
          Stabilizer: 3,
          "Attachment Part": 3,
        },
      },
      "MP 43 1C": {
        HQ: {
          "Weapon Part (HQ)": 1,
          "Stabilizer (HQ)": 1,
          "Attachment Part (HQ)": 1,
        },
      },
      MP5A2: {
        "Non-HQ": {
          "Weapon Part": 15,
          Stabilizer: 8,
          "Attachment Part": 9,
        },
      },
      MP7A2: {
        "Non-HQ": {
          "Weapon Part": 15,
          Stabilizer: 8,
          "Attachment Part": 9,
        },
      },
      PKM: {
        HQ: {
          "Weapon Part (HQ)": 12,
          "Stabilizer (HQ)": 12,
          "Attachment Part (HQ)": 15,
          "Special Gun Barrel": 1,
        },
      },
      PM: {
        "Non-HQ": {
          "Weapon Part": 4,
          Stabilizer: 2,
          "Attachment Part": 2,
        },
      },
      "RPK-74": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 3,
        },
      },
      "Sa-58V": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 2,
        },
      },
      "Sa-58P": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 2,
        },
      },
      "Scar-H": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 3,
        },
      },
      "SIG MCX": {
        "Non-HQ": {
          "Weapon Part": 38,
          Stabilizer: 20,
          "Attachment Part": 23,
        },
      },
      "SIG MCX SPEAR": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 3,
        },
      },
      "SSG10A2-Sniper": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 3,
        },
      },
      "Steyr AUG": {
        "Non-HQ": {
          "Weapon Part": 33,
          Stabilizer: 18,
          "Attachment Part": 20,
        },
      },
      "SR-25 Rifle": {
        HQ: {
          "Weapon Part (HQ)": 2,
          "Stabilizer (HQ)": 2,
          "Attachment Part (HQ)": 3,
        },
      },
      SVD: {
        HQ: {
          "Weapon Part (HQ)": 6,
          "Stabilizer (HQ)": 6,
          "Attachment Part (HQ)": 7,
        },
      },
    },
    Magazines: {
      ".300 Blackout Mag": {
        "Non-HQ": { Ammo: 2 },
      },
      ".338 5rnd FMJ": {
        "Non-HQ": { Ammo: 2 },
      },
      ".50 AE 7rnd Mag": {
        HQ: { "Ammo (HQ)": 2 },
      },
      "12/70 7mm Buckshot": {
        "Non-HQ": { Ammo: 1 },
      },
      "30rnd 9x19 Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "4.6x40 40rnd Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "7Rnd M200 Magazine": {
        HQ: { "Ammo (HQ)": 3 },
      },
      "7.62x39mm 30rnd Sa-58 Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "7.62x51mm 20rnd M14 Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "7.62x51mm 30rnd Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "SR25 7.62x51mm 20rnd": {
        HQ: { "Ammo (HQ)": 1 },
      },
      "8rnd .45 ACP": {
        "Non-HQ": { Ammo: 1 },
      },
      "9x18mm 8rnd PM Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "9x19mm 15rnd M9 Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "100rnd PK Belt": {
        "Non-HQ": { Ammo: 1 },
      },
      "5.56x45mm 200rnd M249 Belt": {
        HQ: { "Ammo (HQ)": 15 },
      },
      "5.56x45mm 30rnd AUG Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "5.56x45mm 30rnd STANAG Mag": {
        "Non-HQ": { Ammo: 1 },
      },
      "5.45x39mm 30rnd AK Mag": {
        "Non-HQ": { Ammo: 2 },
      },
      "5.45x39mm 45rnd RPK-74 Tracer Mag": {
        HQ: { "Ammo (HQ)": 1 },
      },
      "7.62x51mm FMJ": {
        HQ: { "Ammo (HQ)": 1 },
      },
      "7.62x54mmR 100rnd PK Belt": {
        HQ: { "Ammo (HQ)": 15 },
      },
      "7.62x54mmR 10rnd SVD Sniper Mag": {
        HQ: { "Ammo (HQ)": 1 },
      },
      "SPEAR 6.8x51 25rnd": {
        HQ: { "Ammo (HQ)": 1 },
      },
    },
    Attachments: {
      "4x20 Carry Handle Scope": {
        "Non-HQ": {
          Component: 4,
          "Tempered Glass": 1,
        },
      },
      "4.7mm FlashHider": {
        "Non-HQ": { Component: 1 },
      },
      "6.8x51mm FlashHider": {
        "Non-HQ": {
          Component: 2,
          "Tempered Glass": 1,
        },
      },
      "6P20 Muzzle Brake": {
        "Non-HQ": {
          Component: 2,
          "Tempered Glass": 1,
        },
      },
      "6P26 Flash Hider": {
        "Non-HQ": {
          Component: 2,
          "Tempered Glass": 1,
        },
      },
      "7.62x51mm FlashHider": {
        "Non-HQ": {
          Component: 3,
          "Tempered Glass": 1,
        },
      },
      "A2 Flash Hider": {
        "Non-HQ": {
          Component: 2,
          "Tempered Glass": 1,
        },
      },
      "ART II Scope": {
        "Non-HQ": {
          Component: 2,
          "Tempered Glass": 1,
        },
      },
      "Carry Handle Red-Dot-Sight": {
        "Non-HQ": {
          Component: 5,
          "Tempered Glass": 2,
        },
      },
      "EOTECH XPS3": {
        "Non-HQ": {
          Component: 2,
          "Tempered Glass": 1,
        },
      },
      "Elcan Specter": {
        "Non-HQ": {
          Component: 11,
          "Tempered Glass": 5,
        },
      },
      "Leupold VX-6": {
        "Non-HQ": {
          Component: 17,
          "Tempered Glass": 8,
        },
      },
      "PSO-1 Scope": {
        "Non-HQ": {
          Component: 4,
          "Tempered Glass": 1,
        },
      },
      "Reflex Scope": {
        "Non-HQ": {
          Component: 2,
          "Tempered Glass": 1,
        },
      },
      "Vortex RazorHD Gen2": {
        "Non-HQ": {
          Component: 13,
          "Tempered Glass": 9,
        },
      },
    },
    Vehicles: {
      "M1025 Light Armoured Vehicle": {
        "Non-HQ": {
          "Mechanical Component": 9,
          "Interior Part": 5,
          "Engine Part": 9,
        },
      },
      "M151A2 Off-Road": {
        "Non-HQ": {
          "Mechanical Component": 1,
          "Engine Part": 1,
        },
      },
      "M151A2 Off-Road Open Top": {
        "Non-HQ": {
          "Mechanical Component": 1,
          "Engine Part": 1,
        },
      },
      "M923A1 Fuel Truck": {
        HQ: {
          "Mechanical Component (HQ)": 1,
          "Interior Part (HQ)": 1,
          "Engine Part (HQ)": 1,
        },
      },
      "M923A1 Transport Truck": {
        "Non-HQ": {
          "Mechanical Component": 31,
          "Interior Part": 19,
          "Engine Part": 31,
        },
      },
      "M923A1 Transport Truck - Canopy": {
        HQ: {
          "Mechanical Component (HQ)": 2,
          "Interior Part (HQ)": 2,
          "Engine Part (HQ)": 1,
        },
      },
      "M998 Light Utility Vehicle": {
        "Non-HQ": {
          "Mechanical Component": 5,
          "Interior Part": 3,
          "Engine Part": 5,
        },
      },
      "M998 Light Utility Vehicle - Canopy": {
        "Non-HQ": {
          "Mechanical Component": 6,
          "Interior Part": 4,
          "Engine Part": 4,
        },
      },
      "Mi-8MT Transport Helicopter": {
        HQ: {
          "Mechanical Component (HQ)": 30,
          "Interior Part (HQ)": 27,
          "Engine Part (HQ)": 19,
          "Rotor (HQ)": 48,
          "Special Rotor": 1,
        },
      },
      "Pickup-Truck": {
        "Non-HQ": {
          "Mechanical Component": 19,
          "Interior Part": 11,
          "Engine Part": 19,
        },
      },
      "S105 Car": {
        "Non-HQ": {
          "Mechanical Component": 3,
          "Interior Part": 2,
          "Engine Part": 3,
        },
      },
      "S1203 - Laboratory": {
        "Non-HQ": {
          "Mechanical Component": 41,
          "Interior Part": 25,
          "Engine Part": 41,
        },
      },
      "S1203 Minibus": {
        "Non-HQ": {
          "Mechanical Component": 7,
          "Interior Part": 4,
          "Engine Part": 7,
        },
      },
      "UAZ-452 Off-road": {
        "Non-HQ": {
          "Mechanical Component": 3,
          "Interior Part": 2,
          "Engine Part": 3,
        },
      },
      "UAZ-452 Off-road - Laboratory": {
        HQ: {
          "Mechanical Component (HQ)": 4,
          "Interior Part (HQ)": 3,
          "Engine Part (HQ)": 2,
        },
      },
      "UAZ-469 Off-road": {
        "Non-HQ": {
          "Mechanical Component": 1,
          "Interior Part": 1,
          "Engine Part": 1,
        },
      },
      "UAZ-469 Off-road - Open Top": {
        "Non-HQ": {
          "Mechanical Component": 1,
          "Interior Part": 1,
          "Engine Part": 1,
        },
      },
      "UH-1H Transport Helicopter": {
        HQ: {
          "Mechanical Component (HQ)": 19,
          "Interior Part (HQ)": 17,
          "Engine Part (HQ)": 12,
          "Rotor (HQ)": 30,
          "Special Rotor": 1,
        },
      },
      "Ural-4320 Fuel Truck": {
        HQ: {
          "Mechanical Component (HQ)": 4,
          "Interior Part (HQ)": 3,
          "Engine Part (HQ)": 2,
        },
      },
      "Ural-4320 Transport Truck": {
        HQ: {
          "Mechanical Component (HQ)": 4,
          "Interior Part (HQ)": 3,
          "Engine Part (HQ)": 2,
        },
      },
      "Ural-4320 Transport Truck - Canopy": {
        HQ: {
          "Mechanical Component (HQ)": 5,
          "Interior Part (HQ)": 5,
          "Engine Part (HQ)": 3,
        },
      },
      "Ural (Device)": {
        HQ: {
          "Mechanical Component (HQ)": 29,
          "Interior Part (HQ)": 26,
          "Engine Part (HQ)": 18,
        },
      },
      "VW Rolf": {
        "Non-HQ": {
          "Mechanical Component": 31,
          "Interior Part": 19,
          "Engine Part": 31,
        },
      },
    },
    Vests: {
      "6B2 Vest": {
        "Non-HQ": {
          "Iron Plate": 10,
          Cloth: 14,
        },
      },
      "6B3 Vest": {
        HQ: { Kevlar: 5 },
      },
      "M69 Vest": {
        "Non-HQ": {
          "Iron Plate": 10,
          Cloth: 14,
        },
      },
      "PASGT Vest": {
        "Non-HQ": {
          "Iron Plate": 10,
          Cloth: 14,
        },
      },
      "Plate Carrier": {
        HQ: { Kevlar: 5 },
      },
      "TTV110": {
        HQ: { Kevlar: 9 },
      },
    },
    Helmets: {
      "PASGT Helmet": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "PASGT Helmet - Camouflaged": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "PASGT Helmet - Camouflaged Netting": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "SPH-4 Helmet": {
        "Non-HQ": {
          "Iron Plate": 7,
          Cloth: 10,
        },
      },
      "SSh-68 Helmet": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "SSh-68 Helmet - Camouflaged": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "SSh-68 Helmet - Cover": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "SSh-68 Helmet - KZS": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "SSh-68 Helmet - Netting": {
        "Non-HQ": {
          "Iron Plate": 2,
          Cloth: 2,
        },
      },
      "ZSh-5 Helmet": {
        "Non-HQ": {
          "Iron Plate": 7,
          Cloth: 10,
        },
      },
    },
    Clothes: {
      "ADA Assault Pack": {
        "Non-HQ": { Cloth: 32 },
      },
      "ALICE Medium Backpack": {
        "Non-HQ": { Cloth: 2 },
      },
      Bandana: {
        "Non-HQ": { Cloth: 1 },
      },
      Balaclava: {
        "Non-HQ": { Cloth: 1 },
      },
      "BDU Blouse": {
        "Non-HQ": { Cloth: 1 },
      },
      "BDU Blouse - Rolled-up": {
        "Non-HQ": { Cloth: 1 },
      },
      "BDU Trousers": {
        "Non-HQ": { Cloth: 1 },
      },
      Beanie: {
        "Non-HQ": { Cloth: 1 },
      },
      Beret: {
        "Non-HQ": { Cloth: 1 },
      },
      Boonie: {
        "Non-HQ": { Cloth: 1 },
      },
      "Cap - All Variants": {
        "Non-HQ": { Cloth: 1 },
      },
      "Cargo Pants": {
        "Non-HQ": { Cloth: 1 },
      },
      "Cargo Pants (Colored)": {
        "Non-HQ": { Cloth: 1 },
      },
      Cardigan: {
        "Non-HQ": { Cloth: 1 },
      },
      "Classic Shoe": {
        "Non-HQ": { Cloth: 2 },
      },
      "Cotton Shirt": {
        "Non-HQ": { Cloth: 1 },
      },
      "CWU-27 Pilot Coveralls": {
        "Non-HQ": { Cloth: 20 },
      },
      Dress: {
        "Non-HQ": { Cloth: 3 },
      },
      Fedora: {
        "Non-HQ": { Cloth: 1 },
      },
      "Fisher Hat": {
        "Non-HQ": { Cloth: 1 },
      },
      "Flat Cap": {
        "Non-HQ": { Cloth: 1 },
      },
      "Half Mask": {
        "Non-HQ": { Cloth: 1 },
      },
      "Hard Hat": {
        "Non-HQ": { Cloth: 1 },
      },
      Hoodie: {
        "Non-HQ": { Cloth: 2 },
      },
      "Hunting Vest": {
        "Non-HQ": { Cloth: 1 },
      },
      "IIFS Large Combat Field Pack": {
        "Non-HQ": { Cloth: 32 },
      },
      Jacket: {
        "Non-HQ": { Cloth: 2 },
      },
      Jeans: {
        "Non-HQ": { Cloth: 1 },
      },
      "Jeans (Colored)": {
        "Non-HQ": { Cloth: 1 },
      },
      "Jungle Boots": {
        "Non-HQ": { Cloth: 1 },
      },
      "KLMK Coveralls": {
        "Non-HQ": { Cloth: 20 },
      },
      "Knit Cap": {
        "Non-HQ": { Cloth: 1 },
      },
      "Kolobok Backpack": {
        "Non-HQ": { Cloth: 1 },
      },
      "KZS Pants": {
        "Non-HQ": { Cloth: 2 },
      },
      "Leather Jacket (old)": {
        "Non-HQ": { Cloth: 3 },
      },
      "Lumber Jacket - All Variants": {
        "Non-HQ": { Cloth: 3 },
      },
      "M70 Backpack": {
        "Non-HQ": { Cloth: 2 },
      },
      "M70 Cap": {
        "Non-HQ": { Cloth: 1 },
      },
      "M70 Parka": {
        "Non-HQ": { Cloth: 2 },
      },
      "M70 Trousers": {
        "Non-HQ": { Cloth: 2 },
      },
      "M88 Field Cap": {
        "Non-HQ": { Cloth: 1 },
      },
      "M88 Jacket": {
        "Non-HQ": { Cloth: 1 },
      },
      "M88 Jacket - Rolled-up": {
        "Non-HQ": { Cloth: 1 },
      },
      "M88 Trousers": {
        "Non-HQ": { Cloth: 1 },
      },
      "Mask (Medical)": {
        "Non-HQ": { Cloth: 1 },
      },
      "Mask (Latex)": {
        "Non-HQ": { Cloth: 1 },
      },
      "Mask (Ski)": {
        "Non-HQ": { Cloth: 1 },
      },
      "Officer's Cap": {
        "Non-HQ": { Cloth: 64 },
      },
      Panamka: {
        "Non-HQ": { Cloth: 1 },
      },
      "Paper Bag": {
        "Non-HQ": { Cloth: 1 },
      },
      Polo: {
        "Non-HQ": { Cloth: 1 },
      },
      Pullover: {
        "Non-HQ": { Cloth: 1 },
      },
      Raincoat: {
        "Non-HQ": { Cloth: 1 },
      },
      Robe: {
        "Non-HQ": { Cloth: 7 },
      },
      "Runner Shoe": {
        "Non-HQ": { Cloth: 2 },
      },
      Sneaker: {
        "Non-HQ": { Cloth: 4 },
      },
      "Soviet Combat Boots": {
        "Non-HQ": { Cloth: 1 },
      },
      "Soviet Pilot Jacket": {
        "Non-HQ": { Cloth: 11 },
      },
      "Soviet Pilot Pants": {
        "Non-HQ": { Cloth: 1 },
      },
      "Suit Jacket": {
        "Non-HQ": { Cloth: 61 },
      },
      "Suit Pants": {
        "Non-HQ": { Cloth: 50 },
      },
      Sweater: {
        "Non-HQ": { Cloth: 1 },
      },
      "Sweat Pants": {
        "Non-HQ": { Cloth: 1 },
      },
      "Track Jacket": {
        "Non-HQ": { Cloth: 2 },
      },
      "Track Pants": {
        "Non-HQ": { Cloth: 2 },
      },
      TShirt: {
        "Non-HQ": { Cloth: 1 },
      },
      "US Combat Boots": {
        "Non-HQ": { Cloth: 1 },
      },
      "Veshmeshok Backpack": {
        "Non-HQ": { Cloth: 1 },
      },
      "Wool Hat": {
        "Non-HQ": { Cloth: 50 },
      },
    },
    "HQ Components": {
      "Ammo (HQ)": {
        Resources: { Petrol: 1 },
        "Non-HQ": { Ammo: 3 },
      },
      "Attachment Part (HQ)": {
        Resources: { "Wooden Plank": 15 },
        "Non-HQ": { "Attachment Part": 3 },
      },
      "Component (HQ)": {
        Resources: { "Gold Ingot": 15 },
        "Non-HQ": { Component: 2 },
      },
      "Engine Part (HQ)": {
        Resources: { "Copper Ingot": 45, Petrol: 45 },
        "Non-HQ": { "Engine Part": 9 },
      },
      "Interior Part (HQ)": {
        Resources: { "Wooden Plank": 45 },
        "Non-HQ": { "Interior Part": 9 },
      },
      "Mechanical Component (HQ)": {
        Resources: { "Gold Ingot": 45 },
        "Non-HQ": { "Mechanical Component": 9 },
      },
      "Rotor (HQ)": {
        Resources: { "Silver Ingot": 30 },
        "Non-HQ": { Rotor: 9 },
      },
      "Stabilizer (HQ)": {
        Resources: { Polyester: 15 },
        "Non-HQ": { Stabilizer: 3 },
      },
      "Weapon Part (HQ)": {
        Resources: { "Iron Ingot": 15, "Copper Ingot": 15 },
        "Non-HQ": { "Weapon Part": 3 },
      },
      Kevlar: {
        Resources: { "Iron Plate": 1, "Iron Ingot": 20 },
      },
    },
    Components: {
      Cloth: {
        Resources: { Fabric: 1, Polyester: 1 },
      },
      "Iron Plate": {
        Resources: { "Iron Ingot": 1, Fabric: 1, Polyester: 1 },
      },
      Component: {
        Resources: { "Iron Ingot": 1, "Copper Ingot": 1 },
      },
      "Tempered Glass": {
        Resources: { Glass: 2, Polyester: 1 },
      },
      "Weapon Part": {
        Resources: { "Iron Ingot": 1, "Copper Ingot": 1 },
      },
      Stabilizer: {
        Resources: { "Iron Ingot": 2, "Gold Ingot": 1 },
      },
      "Attachment Part": {
        Resources: { "Copper Ingot": 2, "Silver Ingot": 1 },
      },
      Ammo: {
        Resources: { "Iron Ingot": 1, Charcoal: 1 },
      },
      "Mechanical Component": {
        Resources: { "Iron Ingot": 2, "Copper Ingot": 2 },
      },
      "Engine Part": {
        Resources: { "Iron Ingot": 1, "Copper Ingot": 1, Petrol: 1 },
      },
      "Interior Part": {
        Resources: { Fabric: 2, Polyester: 2 },
      },
      Rotor: {
        Resources: { Charcoal: 1, Polyester: 1 },
      },
    },
  };

  const componentResources: ComponentResources = {
    Ammo: { "Iron Ingot": 1, Charcoal: 1 },
    "Attachment Part": { "Copper Ingot": 2, "Silver Ingot": 1 },
    Cloth: { Fabric: 1, Polyester: 1 },
    Component: { "Iron Ingot": 1, "Copper Ingot": 1 },
    "Engine Part": { "Iron Ingot": 1, "Copper Ingot": 1, Petrol: 1 },
    "Interior Part": { Fabric: 2, Polyester: 2 },
    "Iron Plate": { "Iron Ingot": 1, Fabric: 1, Polyester: 1 },
    Kevlar: { "Iron Plate": 1, "Iron Ingot": 20 },
    "Mechanical Component": { "Iron Ingot": 2, "Copper Ingot": 2 },
    Rotor: { Charcoal: 1, Polyester: 1 },
    Stabilizer: { "Iron Ingot": 2, "Gold Ingot": 1 },
    "Tempered Glass": { Glass: 2, Polyester: 1 },
    "Weapon Part": { "Iron Ingot": 1, "Copper Ingot": 1 },
    "Ammo (HQ)": { Ammo: 3, Petrol: 1 },
    "Attachment Part (HQ)": { "Attachment Part": 3, "Wooden Plank": 15 },
    "Component (HQ)": { Component: 2, "Gold Ingot": 15 },
    "Engine Part (HQ)": { "Engine Part": 9, "Copper Ingot": 45, Petrol: 45 },
    "Interior Part (HQ)": { "Interior Part": 9, "Wooden Plank": 45 },
    "Mechanical Component (HQ)": {
      "Mechanical Component": 9,
      "Gold Ingot": 45,
    },
    "Rotor (HQ)": { Rotor: 9, "Silver Ingot": 30 },
    "Stabilizer (HQ)": { Stabilizer: 3, Polyester: 15 },
    "Weapon Part (HQ)": {
      "Weapon Part": 3,
      "Iron Ingot": 15,
      "Copper Ingot": 15,
    },
    "Special Rotor": { "Special Rotor": 1 },
    "Special Gun Barrel": { "Special Gun Barrel": 1 },
  };

  const resourcesList: string[] = [
    "Fabric",
    "Polyester",
    "Iron Ingot",
    "Copper Ingot",
    "Glass",
    "Component",
    "Charcoal",
    "Gold Ingot",
    "Silver Ingot",
    "Petrol",
    "Wooden Plank",
  ];

  // Define which resources need fuel trucks (liquid resources)
  const fuelTruckResources = ["Polyester", "Petrol"];

  // Define which resources need cargo trucks (solid resources)
  const cargoTruckResources = [
    "Fabric",
    "Iron Ingot",
    "Copper Ingot",
    "Glass",
    "Component",
    "Charcoal",
    "Gold Ingot",
    "Silver Ingot",
    "Wooden Plank",
  ];

  // Helper function to check if vehicle is a fuel truck
  const isFuelTruck = (vehicleName: string): boolean => {
    const vehicleData = storageOptions.vehicles[vehicleName];
    return Boolean(
      vehicleData &&
        typeof vehicleData === "object" &&
        "canisters" in vehicleData
    );
  };

  // Helper function to get fuel trucks
  const getFuelTrucks = (): string[] => {
    return Object.keys(storageOptions.vehicles).filter(isFuelTruck);
  };

  // Helper function to get cargo vehicles (now includes fuel trucks since they can carry solid resources too)
  const getCargoVehicles = (): string[] => {
    return Object.keys(storageOptions.vehicles); // All vehicles can carry solid resources
  };

  // ============================================================================
  // !! ADD NEW ITEM DATA HERE
  // ============================================================================
  // Crafting times in seconds
  const craftingTimes: CraftingTimes = {
    // Base Components (seconds per unit)
    Cloth: 10,
    "Iron Plate": 10,
    Component: 10,
    "Tempered Glass": 10,
    "Weapon Part": 10,
    Stabilizer: 10,
    "Attachment Part": 10,
    Ammo: 10,
    "Mechanical Component": 10,
    "Engine Part": 10,
    "Interior Part": 10,
    Rotor: 10,

    // HQ Components (seconds per unit)
    "Component (HQ)": 10,
    Kevlar: 10,
    "Weapon Part (HQ)": 10,
    "Stabilizer (HQ)": 10,
    "Attachment Part (HQ)": 10,
    "Ammo (HQ)": 10,
    "Mechanical Component (HQ)": 10,
    "Engine Part (HQ)": 10,
    "Interior Part (HQ)": 10,
    "Rotor (HQ)": 10,

    // Weapons
    "AK-74": 70,
    "AKS-74U": 70,
    "CheyTac M200 Intervention": 70,
    "Colt 1911": 50,
    "Desert Eagle": 50,
    M16A2: 50,
    "M16A2 - AUTO": 50,
    "M16 Carbine": 50,
    "M21 SWS": 50,
    "M249 SAW": 120,
    M416: 50,
    M9: 50,
    "MP 43 1C": 70,
    MP5A2: 50,
    MP7A2: 50,
    PKM: 130,
    PM: 50,
    "RPK-74": 70,
    "Sa-58P": 70,
    "Sa-58V": 70,
    "Scar-H": 70,
    "SIG MCX": 50,
    "SIG MCX SPEAR": 70,
    "SSG10A2-Sniper": 70,
    "Steyr AUG": 50,
    "SR-25 Rifle": 70,
    SVD: 90,

    // Magazines
    "30rnd 9x19 Mag": 20,
    "8rnd .45 ACP": 20,
    "9x18mm 8rnd PM Mag": 20,
    "9x19mm 15rnd M9 Mag": 20,
    ".300 Blackout Mag": 20,
    ".338 5rnd FMJ": 20,
    ".50 AE 7rnd Mag": 30,
    "12/70 7mm Buckshot": 20,
    "4.6x40 40rnd Mag": 20,
    "5.45x39mm 30rnd AK Mag": 20,
    "5.45x39mm 45rnd RPK-74 Tracer Mag": 30,
    "5.56x45mm 30rnd AUG Mag": 20,
    "5.56x45mm 30rnd STANAG Mag": 20,
    "5.56x45mm 200rnd M249 Belt": 30,
    "7Rnd M200 Magazine": 30,
    "7.62x39mm 30rnd Sa-58 Mag": 20,
    "7.62x51mm FMJ": 30,
    "7.62x51mm 20rnd M14 Mag": 20,
    "7.62x51mm 30rnd Mag": 20,
    "SR25 7.62x51mm 20rnd": 30,
    "7.62x54mmR 100rnd PK Belt": 30,
    "7.62x54mmR 10rnd SVD Sniper Mag": 30,
    "SPEAR 6.8x51 25rnd": 30,

    // Attachments
    "4x20 Carry Handle Scope": 50,
    "4.7mm FlashHider": 30,
    "6.8x51mm FlashHider": 50,
    "6P20 Muzzle Brake": 50,
    "6P26 Flash Hider": 50,
    "7.62x51mm FlashHider": 50,
    "A2 Flash Hider": 50,
    "ART II Scope": 50,
    "Carry Handle Red-Dot-Sight": 50,
    "EOTECH XPS3": 50,
    "Elcan Specter": 50,
    "Leupold VX-6": 50,
    "PSO-1 Scope": 50,
    "Reflex Scope": 50,
    "Vortex RazorHD Gen2": 50,

    // Vehicles
    "M1025 Light Armoured Vehicle": 60,
    "M151A2 Off-Road": 40,
    "M151A2 Off-Road Open Top": 40,
    "M923A1 Fuel Truck": 80,
    "M923A1 Transport Truck": 60,
    "M923A1 Transport Truck - Canopy": 80,
    "M998 Light Utility Vehicle": 60,
    "M998 Light Utility Vehicle - Canopy": 60,
    "Mi-8MT Transport Helicopter": 850,
    "Pickup-Truck": 60,
    "S105 Car": 60,
    "S1203 Minibus": 60,
    "S1203 - Laboratory": 80,
    "UAZ-452 Off-road": 60,
    "UAZ-452 Off-road - Laboratory": 110,
    "UAZ-469 Off-road": 60,
    "UAZ-469 Off-road - Open Top": 60,
    "UH-1H Transport Helicopter": 550,
    "Ural-4320 Fuel Truck": 110,
    "Ural-4320 Transport Truck": 110,
    "Ural-4320 Transport Truck - Canopy": 140,
    "Ural (Device)": 620,
    "VW Rolf": 60,

    // Vests
    "6B2 Vest": 40,
    "6B3 Vest": 40,
    "M69 Vest": 40,
    "PASGT Vest": 40,
    "Plate Carrier": 30,
    "TTV110": 30,

    // Helmets
    "PASGT Helmet": 40,
    "PASGT Helmet - Camouflaged": 40,
    "PASGT Helmet - Camouflaged Netting": 40,
    "SPH-4 Helmet": 40,
    "SSh-68 Helmet": 40,
    "SSh-68 Helmet - Camouflaged": 40,
    "SSh-68 Helmet - Cover": 40,
    "SSh-68 Helmet - KZS": 40,
    "SSh-68 Helmet - Netting": 40,
    "ZSh-5 Helmet": 40,

    // Clothing
    "ADA Assault Pack": 20,
    "ALICE Medium Backpack": 40,
    Bandana: 20,
    Balaclava: 20,
    "BDU Blouse": 20,
    "BDU Blouse - Rolled-up": 20,
    "BDU Trousers": 20,
    Beanie: 20,
    Beret: 20,
    Boonie: 20,
    "Cap - All Variants": 20,
    "Cargo Pants": 20,
    "Cargo Pants (Colored)": 20,
    Cardigan: 20,
    "Classic Shoe": 20,
    "Cotton Shirt": 20,
    "CWU-27 Pilot Coveralls": 20,
    Dress: 20,
    Fedora: 20,
    "Fisher Hat": 20,
    "Flat Cap": 20,
    "Half Mask": 20,
    "Hard Hat": 20,
    Hoodie: 20,
    "Hunting Vest": 20,
    "IIFS Large Combat Field Pack": 20,
    Jacket: 20,
    Jeans: 20,
    "Jeans (Colored)": 20,
    "Jungle Boots": 20,
    "KLMK Coveralls": 20,
    "Knit Cap": 20,
    "Kolobok Backpack": 20,
    "KZS Pants": 20,
    "Leather Jacket (old)": 20,
    "Lumber Jacket - All Variants": 20,
    "M70 Backpack": 20,
    "M70 Cap": 20,
    "M70 Parka": 20,
    "M70 Trousers": 20,
    "M88 Field Cap": 20,
    "M88 Jacket": 20,
    "M88 Jacket - Rolled-up": 20,
    "M88 Trousers": 20,
    "Mask (Medical)": 20,
    "Mask (Latex)": 20,
    "Mask (Ski)": 20,
    "Officer's Cap": 20,
    Panamka: 20,
    "Paper Bag": 20,
    Polo: 20,
    Pullover: 20,
    Raincoat: 20,
    Robe: 20,
    "Runner Shoe": 20,
    Sneaker: 20,
    "Soviet Combat Boots": 20,
    "Soviet Pilot Jacket": 20,
    "Soviet Pilot Pants": 20,
    "Suit Jacket": 20,
    "Suit Pants": 20,
    Sweater: 20,
    "Sweat Pants": 20,
    "Track Jacket": 20,
    "Track Pants": 20,
    TShirt: 20,
    "US Combat Boots": 20,
    "Veshmeshok Backpack": 20,
    "Wool Hat": 20,
  };

  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = "/";
    }
  }, [hasAccess, loading]);

  // Onboarding initialization
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (!onboardingCompleted && hasAccess && !loading) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasAccess, loading]);

  // Load user blueprints and populate items
  useEffect(() => {
    const loadBlueprints = async () => {
      if (selectedCategory === "--" || !itemsByCategory[selectedCategory]) {
        setAvailableItems([]);
        return;
      }

      const allItems = itemsByCategory[selectedCategory] || [];

      // Always show Components and HQ Components regardless of toggle setting
      if (
        selectedCategory === "Components" ||
        selectedCategory === "HQ Components"
      ) {
        setAvailableItems(allItems);
        return;
      }

      if (showAllBlueprints) {
        setAvailableItems(allItems);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const discordId =
          session?.user?.user_metadata?.provider_id ||
          session?.user?.user_metadata?.sub;

        if (!discordId) {
          setAvailableItems([]);
          return;
        }

        const { data: userBlueprints, error } = await supabase
          .from("user_blueprints")
          .select("blueprint_name")
          .eq("discord_id", discordId);

        if (error) {
          console.error("Failed to fetch blueprints:", error);
          setAvailableItems([]);
          return;
        }

        const ownedBlueprints = new Set(
          userBlueprints?.map((bp) => bp.blueprint_name) || []
        );
        const filteredItems = allItems.filter((item: string) =>
          ownedBlueprints.has(item)
        );
        setAvailableItems(filteredItems);
      } catch (error) {
        console.error("Error loading blueprints:", error);
        setAvailableItems([]);
      }
    };

    loadBlueprints();
  }, [selectedCategory, showAllBlueprints, supabase]);

  // Reset selected item when category changes
  useEffect(() => {
    setSelectedItem("");
  }, [selectedCategory]);

  // Auto-calculate when item or vehicles change
  useEffect(() => {
    if (selectedItem && selectedCategory !== "--") {
      calculateResources();
    }
  }, [
    selectedItem,
    selectedCategory,
    quantity,
    selectedFuelVehicle,
    selectedCargoVehicle,
    selectedBackpack,
  ]);

  // Auto-calculate kit when vehicles change
  useEffect(() => {
    if (kit.length > 0 && results) {
      calculateKitQueue();
    }
  }, [selectedFuelVehicle, selectedCargoVehicle, selectedBackpack]);

  // Helper functions
  // Onboarding handlers
  const handleNextTourStep = () => {
    if (currentTourStep < CALCULATOR_TOUR_STEPS.length - 1) {
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

  const calculateCraftingTime = (
    resources: { [key: string]: number },
    components: { [key: string]: number },
    hqComponents: { [key: string]: number },
    finalItems: { [key: string]: number } = {}
  ) => {
    let totalTime = 0;
    const breakdown: {
      name: string;
      count: number;
      timePerUnit: number;
      total: number;
    }[] = [];

    const addTime = (name: string, count: number) => {
      const timePerUnit = craftingTimes[name] || 0;
      totalTime += timePerUnit * count;
      if (timePerUnit > 0) {
        breakdown.push({
          name,
          count,
          timePerUnit,
          total: timePerUnit * count,
        });
      }
    };

    // Add time for base resources (but only those that are actually craftable components)
    const craftableComponents = [
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
    ];

    for (const [name, count] of Object.entries(resources)) {
      if (craftableComponents.includes(name)) {
        addTime(name, count);
      }
    }

    // Add time for components
    for (const [name, count] of Object.entries(components))
      addTime(name, count);

    // Add time for HQ components
    for (const [name, count] of Object.entries(hqComponents))
      addTime(name, count);

    // Add time for final products
    for (const [name, count] of Object.entries(finalItems))
      addTime(name, count);

    return { totalTime, breakdown };
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m > 0 ? m + "m " : ""}${s}s`;
  };

  const collectBaseResources = (componentName: string, quantity: number) => {
    const localMap: { [key: string]: number } = {};
    const componentsMap: { [key: string]: number } = {};

    const helper = (compName: string, qty: number) => {
      const isResource = resourcesList.includes(compName);
      const isComponent = [
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
      ].includes(compName);

      const sub = componentResources[compName];

      // If this is a component (not a raw resource), add it to components map
      if (isComponent && sub) {
        componentsMap[compName] = (componentsMap[compName] || 0) + qty;
      }

      // If there's no sub-recipe, it's a raw resource
      if (!sub) {
        localMap[compName] = (localMap[compName] || 0) + qty;
        return;
      }

      // Recursively break down the component into its sub-components/resources
      for (const [subName, subQty] of Object.entries(sub)) {
        helper(subName, subQty * qty);
      }
    };

    helper(componentName, quantity);
    return { resources: localMap, components: componentsMap };
  };

  // Helper function to analyze transport requirements
  const analyzeTransportRequirements = (totalResources: {
    [key: string]: number;
  }) => {
    const fuelResources: string[] = [];
    const cargoResources: string[] = [];

    for (const [resource, amount] of Object.entries(totalResources)) {
      if (resourcesList.includes(resource)) {
        if (fuelTruckResources.includes(resource)) {
          fuelResources.push(resource);
        } else if (cargoTruckResources.includes(resource)) {
          cargoResources.push(resource);
        }
      }
    }

    return {
      needsFuelTruck: fuelResources.length > 0,
      needsCargoTruck: cargoResources.length > 0,
      fuelResources,
      cargoResources,
    };
  };

  const calculateMaterialRuns = (totalResources: { [key: string]: number }) => {
    const transportRequirements = analyzeTransportRequirements(totalResources);

    let fuelTruckRuns = undefined;
    let cargoTruckRuns = undefined;

    // Calculate fuel truck runs if needed
    if (transportRequirements.needsFuelTruck) {
      let fuelVehicleCap = 0;
      const fuelVehicleData = storageOptions.vehicles[selectedFuelVehicle];
      if (
        fuelVehicleData !== undefined &&
        typeof fuelVehicleData === "object" &&
        "canisters" in fuelVehicleData
      ) {
        fuelVehicleCap = fuelVehicleData.canisters;
      }

      const backpackCap = storageOptions.backpacks[selectedBackpack] || 0;
      const totalFuelCap = fuelVehicleCap + backpackCap;

      let totalFuelResources = 0;
      let totalFuelRuns = 0;
      const fuelRunDetails: { [key: string]: number } = {};

      for (const [resource, amount] of Object.entries(totalResources)) {
        if (
          fuelTruckResources.includes(resource) &&
          resourcesList.includes(resource)
        ) {
          const runsNeeded =
            totalFuelCap > 0 ? Math.ceil(amount / totalFuelCap) : 0;
          fuelRunDetails[resource] = runsNeeded;
          totalFuelResources += amount;
          totalFuelRuns += runsNeeded;
        }
      }

      fuelTruckRuns = {
        runDetails: fuelRunDetails,
        totalRuns: totalFuelRuns,
        totalResources: totalFuelResources,
        totalCap: totalFuelCap,
        vehicle: selectedFuelVehicle,
        backpack: selectedBackpack,
      };
    }

    // Calculate cargo truck runs if needed
    if (transportRequirements.needsCargoTruck) {
      let cargoVehicleCap = 0;
      const cargoVehicleData = storageOptions.vehicles[selectedCargoVehicle];

      // Handle both fuel trucks (which can carry solid resources) and regular cargo vehicles
      if (cargoVehicleData !== undefined) {
        if (typeof cargoVehicleData === "number") {
          cargoVehicleCap = cargoVehicleData;
        } else if (
          typeof cargoVehicleData === "object" &&
          "canisters" in cargoVehicleData
        ) {
          // Fuel trucks can carry the same amount of solid resources as liquid resources
          cargoVehicleCap = cargoVehicleData.canisters;
        }
      }

      const backpackCap = storageOptions.backpacks[selectedBackpack] || 0;
      const totalCargoCap = cargoVehicleCap + backpackCap;

      let totalCargoResources = 0;
      let totalCargoRuns = 0;
      const cargoRunDetails: { [key: string]: number } = {};

      for (const [resource, amount] of Object.entries(totalResources)) {
        if (
          cargoTruckResources.includes(resource) &&
          resourcesList.includes(resource)
        ) {
          const runsNeeded =
            totalCargoCap > 0 ? Math.ceil(amount / totalCargoCap) : 0;
          cargoRunDetails[resource] = runsNeeded;
          totalCargoResources += amount;
          totalCargoRuns += runsNeeded;
        }
      }

      cargoTruckRuns = {
        runDetails: cargoRunDetails,
        totalRuns: totalCargoRuns,
        totalResources: totalCargoResources,
        totalCap: totalCargoCap,
        vehicle: selectedCargoVehicle,
        backpack: selectedBackpack,
      };
    }

    return {
      fuelTruckRuns,
      cargoTruckRuns,
      transportRequirements,
    };
  };

  const calculateResources = () => {
    if (!selectedItem || selectedCategory === "--") return;

    const selectedCategoryData = itemComponents[selectedCategory];
    const itemData = selectedCategoryData?.[selectedItem];

    if (!itemData) return;

    let totalResources: { [key: string]: number } = {};
    let totalComponents: { [key: string]: number } = {};
    let totalHQComponents: { [key: string]: number } = {};
    let hqComponentBreakdown: { [key: string]: { [key: string]: number } } = {};
    let nonHQComponentBreakdown: { [key: string]: { [key: string]: number } } =
      {};

    // Process HQ components
    if (itemData["HQ"]) {
      for (const [hqComponent, hqQty] of Object.entries(itemData["HQ"])) {
        const hqQuantity = hqQty * quantity;
        totalHQComponents[hqComponent] =
          (totalHQComponents[hqComponent] || 0) + hqQuantity;

        if (
          hqComponent !== "Special Rotor" &&
          hqComponent !== "Special Gun Barrel"
        ) {
          const { resources: resMap, components: compMap } =
            collectBaseResources(hqComponent, hqQuantity);
          hqComponentBreakdown[hqComponent] = resMap;

          for (const [res, qty] of Object.entries(resMap)) {
            totalResources[res] = (totalResources[res] || 0) + qty;
          }
          for (const [comp, qty] of Object.entries(compMap)) {
            totalComponents[comp] = (totalComponents[comp] || 0) + qty;
          }
        }
      }
    }

    // Process direct resources
    if (itemData["Resources"]) {
      for (const [resource, resourceQty] of Object.entries(
        itemData["Resources"]
      )) {
        const resourceQuantity = resourceQty * quantity;
        // Check if this "resource" is actually a component that needs to be crafted
        const isComponent = [
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
        ].includes(resource);

        if (isComponent) {
          // Add to components and break down into base resources
          totalComponents[resource] =
            (totalComponents[resource] || 0) + resourceQuantity;

          const { resources: resMap } = collectBaseResources(
            resource,
            resourceQuantity
          );
          for (const [res, qty] of Object.entries(resMap)) {
            totalResources[res] = (totalResources[res] || 0) + qty;
          }
        } else {
          // It's a true raw resource
          totalResources[resource] =
            (totalResources[resource] || 0) + resourceQuantity;
        }
      }
    }

    // Process Non-HQ components
    if (itemData["Non-HQ"]) {
      for (const [nonHQComponent, nonHQQty] of Object.entries(
        itemData["Non-HQ"]
      )) {
        const nonHQQuantity = nonHQQty * quantity;
        totalComponents[nonHQComponent] =
          (totalComponents[nonHQComponent] || 0) + nonHQQuantity;

        if (componentResources[nonHQComponent]) {
          const { resources: resMap, components: compMap } =
            collectBaseResources(nonHQComponent, nonHQQuantity);
          nonHQComponentBreakdown[nonHQComponent] = resMap;

          for (const [res, qty] of Object.entries(resMap)) {
            totalResources[res] = (totalResources[res] || 0) + qty;
          }
        }
      }
    }

    const materialRuns = calculateMaterialRuns(totalResources);

    // Calculate crafting time for single item
    const finalItems = selectedItem ? { [selectedItem]: quantity } : {};
    const craftingTime = calculateCraftingTime(
      totalResources,
      totalComponents,
      totalHQComponents,
      finalItems
    );

    setResults({
      resources: totalResources,
      components: totalComponents,
      hqComponents: totalHQComponents,
      hqBreakdown: hqComponentBreakdown,
      nonHQBreakdown: nonHQComponentBreakdown,
      materialRuns,
      craftingTime,
    });
  };

  const addToKit = () => {
    if (!selectedItem || selectedCategory === "--" || quantity <= 0) return;

    const existing = kit.find(
      (entry) =>
        entry.item === selectedItem && entry.category === selectedCategory
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      setKit([
        ...kit,
        { category: selectedCategory, item: selectedItem, quantity },
      ]);
    }

    setShowKitSidebar(true);
  };

  const removeFromKit = (index: number) => {
    const newKit = [...kit];
    newKit.splice(index, 1);
    setKit(newKit);
  };

  const clearKit = () => {
    setKit([]);
    setResults(null);
  };

  const calculateKitQueue = () => {
    const totalResources: { [key: string]: number } = {};
    const totalComponents: { [key: string]: number } = {};
    const totalHQComponents: { [key: string]: number } = {};
    const hqComponentBreakdown: { [key: string]: { [key: string]: number } } =
      {};
    const nonHQComponentBreakdown: {
      [key: string]: { [key: string]: number };
    } = {};

    kit.forEach((entry) => {
      const selectedCategoryData = itemComponents[entry.category];
      if (!selectedCategoryData) return;

      const itemData = selectedCategoryData[entry.item];
      if (!itemData) return;

      const itemQuantity = entry.quantity;

      // Process HQ components
      if (itemData["HQ"]) {
        for (const [hqComponent, hqQty] of Object.entries(itemData["HQ"])) {
          const hqQuantity = hqQty * itemQuantity;
          totalHQComponents[hqComponent] =
            (totalHQComponents[hqComponent] || 0) + hqQuantity;

          if (
            hqComponent !== "Special Rotor" &&
            hqComponent !== "Special Gun Barrel"
          ) {
            const { resources: resMap, components: compMap } =
              collectBaseResources(hqComponent, hqQuantity);

            hqComponentBreakdown[hqComponent] =
              hqComponentBreakdown[hqComponent] || {};
            for (const [res, qty] of Object.entries(resMap)) {
              hqComponentBreakdown[hqComponent][res] =
                (hqComponentBreakdown[hqComponent][res] || 0) + qty;
              totalResources[res] = (totalResources[res] || 0) + qty;
            }

            for (const [comp, qty] of Object.entries(compMap)) {
              totalComponents[comp] = (totalComponents[comp] || 0) + qty;
            }
          }
        }
      }

      // Process direct resources from the item itself
      if (itemData["Resources"]) {
        for (const [resource, resourceQty] of Object.entries(
          itemData["Resources"]
        )) {
          const resourceQuantity = resourceQty * itemQuantity;
          // Check if this "resource" is actually a component that needs to be crafted
          const isComponent = [
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
          ].includes(resource);

          if (isComponent) {
            // Add to components and break down into base resources
            totalComponents[resource] =
              (totalComponents[resource] || 0) + resourceQuantity;

            const { resources: resMap } = collectBaseResources(
              resource,
              resourceQuantity
            );
            for (const [res, qty] of Object.entries(resMap)) {
              totalResources[res] = (totalResources[res] || 0) + qty;
            }
          } else {
            // It's a true raw resource
            totalResources[resource] =
              (totalResources[resource] || 0) + resourceQuantity;
          }
        }
      }

      // Process Non-HQ components
      if (itemData["Non-HQ"]) {
        for (const [nonHQComponent, nonHQQty] of Object.entries(
          itemData["Non-HQ"]
        )) {
          const nonHQQuantity = nonHQQty * itemQuantity;
          totalComponents[nonHQComponent] =
            (totalComponents[nonHQComponent] || 0) + nonHQQuantity;

          if (componentResources[nonHQComponent]) {
            const { resources: resMap, components: compMap } =
              collectBaseResources(nonHQComponent, nonHQQuantity);

            nonHQComponentBreakdown[nonHQComponent] =
              nonHQComponentBreakdown[nonHQComponent] || {};
            for (const [res, qty] of Object.entries(resMap)) {
              nonHQComponentBreakdown[nonHQComponent][res] =
                (nonHQComponentBreakdown[nonHQComponent][res] || 0) + qty;
              totalResources[res] = (totalResources[res] || 0) + qty;
            }
          }
        }
      }
    });

    const materialRuns = calculateMaterialRuns(totalResources);

    // Calculate crafting time for kit - collect all final items
    const finalItems: { [key: string]: number } = {};
    kit.forEach((entry) => {
      finalItems[entry.item] = (finalItems[entry.item] || 0) + entry.quantity;
    });

    const craftingTime = calculateCraftingTime(
      totalResources,
      totalComponents,
      totalHQComponents,
      finalItems
    );

    setResults({
      resources: totalResources,
      components: totalComponents,
      hqComponents: totalHQComponents,
      hqBreakdown: hqComponentBreakdown,
      nonHQBreakdown: nonHQComponentBreakdown,
      materialRuns,
      craftingTime,
    });

    setShowBreakdown(true);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  // Check if transport requirements analysis is needed
  const transportRequirements = results?.materialRuns?.transportRequirements;
  const needsBothVehicles =
    transportRequirements?.needsFuelTruck &&
    transportRequirements?.needsCargoTruck;
  const needsOnlyFuel =
    transportRequirements?.needsFuelTruck &&
    !transportRequirements?.needsCargoTruck;
  const needsOnlyCargo =
    !transportRequirements?.needsFuelTruck &&
    transportRequirements?.needsCargoTruck;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* App Container - Mobile optimized padding */}
          <div className="bg-background-secondary/80 backdrop-blur-lg border border-white/5 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            {/* Title Bar - Mobile optimized typography */}
            <div
              className="flex justify-between items-center mb-6 sm:mb-8 flex-wrap gap-4"
              data-tour="calculator-header"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-500 flex items-center flex-wrap">
                Crafting Calculator
                <span className="ml-2 text-xs bg-primary-500 text-black px-1.5 py-0.5 rounded font-bold">
                  v2
                </span>
              </h1>
            </div>

            {/* Form Section - Mobile optimized spacing */}
            <div className="space-y-4 sm:space-y-6">
              {/* Show All Blueprints Toggle */}
              <div
                className="flex items-center justify-between"
                data-tour="show-all-toggle"
              >
                <label
                  htmlFor="showAllToggle"
                  className="text-white/90 font-medium"
                >
                  Show All Blueprints:
                </label>
                <label className="relative inline-block w-12 h-6">
                  <input
                    type="checkbox"
                    id="showAllToggle"
                    checked={showAllBlueprints}
                    onChange={(e) => setShowAllBlueprints(e.target.checked)}
                    className="opacity-0 w-0 h-0"
                  />
                  <span
                    className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                      showAllBlueprints ? "bg-primary-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute h-4 w-4 rounded-full bg-white transition-all duration-300 top-1 ${
                        showAllBlueprints ? "left-7" : "left-1"
                      }`}
                    ></span>
                  </span>
                </label>
              </div>

              {/* Category Selection - Mobile optimized input */}
              <div data-tour="category-selector">
                <label
                  htmlFor="categories"
                  className="block text-white/90 font-medium mb-2"
                >
                  Select Category:
                </label>
                <select
                  id="categories"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full min-h-[44px] p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none text-base"
                >
                  <option value="--">--</option>
                  {Object.keys(itemsByCategory).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Selection - Mobile responsive layout */}
              <div data-tour="item-selector">
                <label
                  htmlFor="items"
                  className="block text-white/90 font-medium mb-2"
                >
                  Select Item:
                </label>
                <div className="flex flex-col md:flex-row gap-4">
                  <select
                    id="items"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    disabled={selectedCategory === "--"}
                    className="flex-1 min-h-[44px] p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none disabled:opacity-50 text-base"
                  >
                    <option value="">Choose an item...</option>
                    {availableItems.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-center md:justify-start md:px-4 py-2 md:py-0 font-semibold text-white/90">
                    Crafting Level:{" "}
                    {selectedItem
                      ? craftingLevels[selectedItem] ?? "N/A"
                      : "N/A"}
                  </div>
                </div>
              </div>

              {/* Quantity - Mobile optimized input */}
              <div data-tour="quantity-input">
                <label
                  htmlFor="quantity"
                  className="block text-white/90 font-medium mb-2"
                >
                  Quantity:
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full min-h-[44px] p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none text-base"
                />
              </div>

              {/* Transport Kit - Mobile responsive grid */}
              <div data-tour="storage-options">
                <h3 className="text-lg sm:text-xl text-primary-500 font-semibold mb-4">
                  Your Transport Kit
                </h3>

                {/* Transport Requirements Warning */}
                {transportRequirements && (
                  <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                    <div className="text-white font-semibold mb-2">
                      Transport Requirements:
                    </div>
                    {needsBothVehicles && (
                      <div className="text-yellow-300">
                        ⚠️ Multiple vehicle types required for this selection
                      </div>
                    )}
                    {transportRequirements.needsFuelTruck && (
                      <div className="text-blue-300">
                        🛢️ Fuel Truck needed for:{" "}
                        {transportRequirements.fuelResources.join(", ")}
                      </div>
                    )}
                    {transportRequirements.needsCargoTruck && (
                      <div className="text-green-300">
                        📦 Cargo Vehicle needed for:{" "}
                        {transportRequirements.cargoResources.join(", ")}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Fuel Vehicle Selection */}
                  <div>
                    <label
                      htmlFor="fuelVehicleSelect"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Select Fuel Truck:
                      {transportRequirements?.needsFuelTruck && (
                        <span className="text-blue-300 ml-1">*Required</span>
                      )}
                    </label>
                    <select
                      id="fuelVehicleSelect"
                      value={selectedFuelVehicle}
                      onChange={(e) => setSelectedFuelVehicle(e.target.value)}
                      disabled={!transportRequirements?.needsFuelTruck}
                      className={`w-full min-h-[44px] p-3 bg-background-tertiary border rounded-lg text-white focus:outline-none text-base ${
                        transportRequirements?.needsFuelTruck
                          ? "border-blue-500 focus:border-blue-400"
                          : "border-white/20 opacity-50"
                      }`}
                    >
                      <option value="">-- Select Fuel Truck --</option>
                      {getFuelTrucks().map((vehicle) => {
                        const vehicleData = storageOptions.vehicles[vehicle];
                        const canisters =
                          typeof vehicleData === "object" &&
                          "canisters" in vehicleData
                            ? vehicleData.canisters
                            : 0;
                        return (
                          <option key={vehicle} value={vehicle}>
                            {vehicle} ({canisters} canisters)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Cargo Vehicle Selection */}
                  <div>
                    <label
                      htmlFor="cargoVehicleSelect"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Select Cargo Vehicle:
                      {transportRequirements?.needsCargoTruck && (
                        <span className="text-green-300 ml-1">*Required</span>
                      )}
                    </label>
                    <select
                      id="cargoVehicleSelect"
                      value={selectedCargoVehicle}
                      onChange={(e) => setSelectedCargoVehicle(e.target.value)}
                      disabled={!transportRequirements?.needsCargoTruck}
                      className={`w-full min-h-[44px] p-3 bg-background-tertiary border rounded-lg text-white focus:outline-none text-base ${
                        transportRequirements?.needsCargoTruck
                          ? "border-green-500 focus:border-green-400"
                          : "border-white/20 opacity-50"
                      }`}
                    >
                      <option value="">-- Select Cargo Vehicle --</option>
                      {getCargoVehicles().map((vehicle) => {
                        const vehicleData = storageOptions.vehicles[vehicle];
                        let storage = 0;

                        if (typeof vehicleData === "number") {
                          storage = vehicleData;
                        } else if (
                          typeof vehicleData === "object" &&
                          "canisters" in vehicleData
                        ) {
                          // Fuel trucks can carry the same amount of solid resources as liquid resources
                          storage = vehicleData.canisters;
                        }

                        return (
                          <option key={vehicle} value={vehicle}>
                            {vehicle} ({storage} storage)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Backpack Selection - spans both columns */}
                  <div className="lg:col-span-2">
                    <label
                      htmlFor="backpackSelect"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Select Backpack:
                    </label>
                    <select
                      id="backpackSelect"
                      value={selectedBackpack}
                      onChange={(e) => setSelectedBackpack(e.target.value)}
                      className="w-full min-h-[44px] p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none text-base"
                    >
                      <option value="">-- Select Backpack --</option>
                      {Object.keys(storageOptions.backpacks).map((backpack) => (
                        <option key={backpack} value={backpack}>
                          {backpack} ({storageOptions.backpacks[backpack]}{" "}
                          storage)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Mobile optimized sizing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={calculateResources}
                  className="w-full min-h-[44px] px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 text-base"
                  data-tour="calculate-button"
                >
                  Calculate Materials
                </button>
                <button
                  onClick={addToKit}
                  className="w-full min-h-[44px] px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 text-base"
                  data-tour="kit-system"
                >
                  Add to Kit
                </button>
              </div>
            </div>

            {/* Results */}
            {results && (
              <div className="mt-8 bg-background-tertiary/70 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-primary-500 border-b border-gray-600 pb-2 mb-4">
                  Resources Needed
                </h2>

                {Object.keys(results.resources).length > 0 && (
                  <ul className="space-y-1 mb-6">
                    {Object.entries(results.resources).map(([name, qty]) => (
                      <li key={name} className="text-white/90">
                        {name}: {qty}
                      </li>
                    ))}
                  </ul>
                )}

                {Object.keys(results.components).length > 0 &&
                  selectedCategory !== "Components" && (
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-primary-500 border-b border-gray-600 pb-2 mb-4">
                        Components Needed
                      </h2>
                      <ul className="space-y-1">
                        {Object.entries(results.components).map(
                          ([name, qty]) => (
                            <li key={name} className="text-white/90">
                              {name}: {qty}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {Object.keys(results.hqComponents).length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-primary-500 border-b border-gray-600 pb-2 mb-4">
                      HQ Components Needed
                    </h2>
                    <ul className="space-y-1">
                      {Object.entries(results.hqComponents).map(
                        ([name, qty]) => (
                          <li key={name} className="text-white/90">
                            {name}: {qty}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* Crafting Time */}
                {results.craftingTime && (
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold text-primary-500 border-b border-gray-600 pb-2 mb-4">
                      Estimated Crafting Time
                    </h2>
                    <div className="text-white font-semibold text-lg">
                      {formatTime(results.craftingTime.totalTime)} total
                    </div>
                  </div>
                )}

                {/* Material Runs */}
                {results.materialRuns && (
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold text-primary-500 border-b border-gray-600 pb-2 mb-4">
                      Transport Operations
                    </h2>

                    {/* Fuel Truck Operations */}
                    {results.materialRuns.fuelTruckRuns && (
                      <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                        <h3 className="text-blue-300 font-semibold mb-2 flex items-center">
                          🛢️ Fuel Truck Operations
                        </h3>
                        {results.materialRuns.fuelTruckRuns.totalCap === 0 ? (
                          <p className="text-red-400">
                            Please select a valid fuel truck and backpack.
                          </p>
                        ) : (
                          <div>
                            {Object.entries(
                              results.materialRuns.fuelTruckRuns.runDetails
                            ).map(([resource, runs]) => (
                              <div key={resource} className="text-white/90">
                                {resource}: {runs} run(s)
                              </div>
                            ))}
                            <div className="mt-2 font-semibold text-blue-200">
                              Total:{" "}
                              <strong>
                                {results.materialRuns.fuelTruckRuns.totalRuns}
                              </strong>{" "}
                              fuel truck run(s) for{" "}
                              <strong>
                                {
                                  results.materialRuns.fuelTruckRuns
                                    .totalResources
                                }
                              </strong>{" "}
                              liquid resources using{" "}
                              <strong>
                                {results.materialRuns.fuelTruckRuns.vehicle}
                              </strong>
                              {results.materialRuns.fuelTruckRuns.backpack &&
                                ` + ${results.materialRuns.fuelTruckRuns.backpack}`}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cargo Truck Operations */}
                    {results.materialRuns.cargoTruckRuns && (
                      <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <h3 className="text-green-300 font-semibold mb-2 flex items-center">
                          📦 Cargo Vehicle Operations
                        </h3>
                        {results.materialRuns.cargoTruckRuns.totalCap === 0 ? (
                          <p className="text-red-400">
                            Please select a valid cargo vehicle and backpack.
                          </p>
                        ) : (
                          <div>
                            {Object.entries(
                              results.materialRuns.cargoTruckRuns.runDetails
                            ).map(([resource, runs]) => (
                              <div key={resource} className="text-white/90">
                                {resource}: {runs} run(s)
                              </div>
                            ))}
                            <div className="mt-2 font-semibold text-green-200">
                              Total:{" "}
                              <strong>
                                {results.materialRuns.cargoTruckRuns.totalRuns}
                              </strong>{" "}
                              cargo vehicle run(s) for{" "}
                              <strong>
                                {
                                  results.materialRuns.cargoTruckRuns
                                    .totalResources
                                }
                              </strong>{" "}
                              solid resources using{" "}
                              <strong>
                                {results.materialRuns.cargoTruckRuns.vehicle}
                              </strong>
                              {results.materialRuns.cargoTruckRuns.backpack &&
                                ` + ${results.materialRuns.cargoTruckRuns.backpack}`}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total Summary */}
                    {(results.materialRuns.fuelTruckRuns ||
                      results.materialRuns.cargoTruckRuns) && (
                      <div className="mt-4 p-4 bg-primary-500/20 border border-primary-500/50 rounded-lg">
                        <h3 className="text-primary-300 font-semibold mb-2">
                          📋 Total Transport Summary
                        </h3>
                        <div className="text-white font-semibold">
                          You will need:{" "}
                          {results.materialRuns.fuelTruckRuns && (
                            <span className="text-blue-300">
                              {results.materialRuns.fuelTruckRuns.totalRuns}{" "}
                              fuel truck run(s)
                            </span>
                          )}
                          {results.materialRuns.fuelTruckRuns &&
                            results.materialRuns.cargoTruckRuns && (
                              <span className="text-white"> + </span>
                            )}
                          {results.materialRuns.cargoTruckRuns && (
                            <span className="text-green-300">
                              {results.materialRuns.cargoTruckRuns.totalRuns}{" "}
                              cargo vehicle run(s)
                            </span>
                          )}
                          {" = "}
                          <span className="text-primary-300">
                            {(results.materialRuns.fuelTruckRuns?.totalRuns ||
                              0) +
                              (results.materialRuns.cargoTruckRuns?.totalRuns ||
                                0)}{" "}
                            total run(s)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Breakdown Button */}
            {results && (
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="mt-4 w-full p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:scale-105"
              >
                {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
              </button>
            )}

            {/* Breakdown Section */}
            {showBreakdown && results && (
              <div className="mt-6 bg-background-tertiary/70 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-primary-500 border-b border-gray-600 pb-2 mb-4">
                  Resources by Component:
                </h3>

                {Object.entries(results.nonHQBreakdown || {}).map(
                  ([component, resources]) => (
                    <div key={component} className="mb-4">
                      <div className="font-semibold text-white text-lg">
                        {component}
                      </div>
                      <ul className="pl-4 space-y-1">
                        {Object.entries(resources).map(([resName, qty]) => (
                          <li key={resName} className="text-white/90">
                            {resName}: {qty}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}

                {Object.entries(results.hqBreakdown || {}).map(
                  ([component, resources]) => (
                    <div key={component} className="mb-4">
                      <div className="font-semibold text-white text-lg">
                        {component}
                      </div>
                      <ul className="pl-4 space-y-1">
                        {Object.entries(resources).map(([resName, qty]) => (
                          <li key={resName} className="text-white/90">
                            {resName}: {qty}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-8 text-white/50">
              <p>Updated | July 24, 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kit Sidebar */}
      {showKitSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowKitSidebar(false)}
          />
          <div className="w-80 max-w-[90vw] bg-background-secondary/95 backdrop-blur-lg border-l border-white/10 p-6 overflow-y-auto flex flex-col">
            <button
              onClick={() => setShowKitSidebar(false)}
              className="self-end text-white/70 hover:text-white text-2xl mb-4"
            >
              ×
            </button>

            <h3 className="text-primary-500 text-xl font-semibold mb-4">
              Build a Kit
            </h3>

            <div className="flex-1">
              {kit.length === 0 ? (
                <p className="text-white/70">No items in kit.</p>
              ) : (
                <ul className="space-y-3">
                  {kit.map((entry, index) => (
                    <li key={index} className="bg-white/5 p-3 rounded-lg">
                      <div className="font-semibold text-white">
                        {entry.item}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-white/70">
                          (x{entry.quantity})
                        </span>
                        <button
                          onClick={() => removeFromKit(index)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 mt-6">
              <button
                onClick={calculateKitQueue}
                className="w-full p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
              >
                Calculate All
              </button>
              <button
                onClick={clearKit}
                className="w-full p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
              >
                Clear Kit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Kit Button */}
      {!showKitSidebar && kit.length > 0 && (
        <button
          onClick={() => setShowKitSidebar(true)}
          className="fixed bottom-4 right-4 bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors z-40"
        >
          🛠️ Build a Kit
        </button>
      )}

      {/* Onboarding Tour */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingTooltip
            step={CALCULATOR_TOUR_STEPS[currentTourStep]}
            isVisible={showOnboarding}
            onNext={handleNextTourStep}
            onSkip={handleSkipTour}
            currentStep={currentTourStep}
            totalSteps={CALCULATOR_TOUR_STEPS.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
