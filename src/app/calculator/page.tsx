"use client";

import { usePageTracking } from "@/hooks/usePageTracking";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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
    runDetails: { [key: string]: number };
    totalRuns: number;
    totalRawResources: number;
    totalCap: number;
    vehicle: string;
    backpack: string;
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
  const [showAllBlueprints, setShowAllBlueprints] = useState(false);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedBackpack, setSelectedBackpack] = useState("");
  const [kit, setKit] = useState<KitItem[]>([]);
  const [showKitSidebar, setShowKitSidebar] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [results, setResults] = useState<CalculationResults | null>(null);

  // Data
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

  const craftingLevels: { [key: string]: number } = {
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
      "UAZ-452 Off-Road - Laboratory": { canisters: 110 },
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
      "ALICE Medium Backpack": 13,
      "IIFS Large Combat Field Pack": 19,
      "Kolobok Backpack": 10,
      "M70 Backpack": 13,
      "Veshmeshok Backpack": 6,
    },
  };

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
        "Non-HQ": { "Weapon Part": 5, Stabilizer: 3, "Attachment Part": 3 },
      },
      "Desert Eagle": {
        "Non-HQ": { "Weapon Part": 13, Stabilizer: 7, "Attachment Part": 8 },
      },
      M16A2: {
        "Non-HQ": { "Weapon Part": 27, Stabilizer: 15, "Attachment Part": 17 },
      },
      "M16A2 - AUTO": {
        "Non-HQ": { "Weapon Part": 29, Stabilizer: 16, "Attachment Part": 18 },
      },
      "M16 Carbine": {
        "Non-HQ": { "Weapon Part": 29, Stabilizer: 16, "Attachment Part": 18 },
      },
      "M21 SWS": {
        "Non-HQ": { "Weapon Part": 39, Stabilizer: 21, "Attachment Part": 24 },
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
        "Non-HQ": { "Weapon Part": 34, Stabilizer: 19, "Attachment Part": 21 },
      },
      M9: {
        "Non-HQ": { "Weapon Part": 5, Stabilizer: 3, "Attachment Part": 3 },
      },
      "MP 43 1C": {
        HQ: {
          "Weapon Part (HQ)": 1,
          "Stabilizer (HQ)": 1,
          "Attachment Part (HQ)": 1,
        },
      },
      MP5A2: {
        "Non-HQ": { "Weapon Part": 15, Stabilizer: 8, "Attachment Part": 9 },
      },
      MP7A2: {
        "Non-HQ": { "Weapon Part": 15, Stabilizer: 8, "Attachment Part": 9 },
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
        "Non-HQ": { "Weapon Part": 4, Stabilizer: 2, "Attachment Part": 2 },
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
        "Non-HQ": { "Weapon Part": 38, Stabilizer: 20, "Attachment Part": 23 },
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
        "Non-HQ": { "Weapon Part": 33, Stabilizer: 18, "Attachment Part": 20 },
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
      ".300 Blackout Mag": { "Non-HQ": { Ammo: 2 } },
      ".338 5rnd FMJ": { "Non-HQ": { Ammo: 2 } },
      ".50 AE 7rnd Mag": { HQ: { "Ammo (HQ)": 2 } },
      "12/70 7mm Buckshot": { "Non-HQ": { Ammo: 1 } },
      "30rnd 9x19 Mag": { "Non-HQ": { Ammo: 1 } },
      "4.6x40 40rnd Mag": { "Non-HQ": { Ammo: 1 } },
      "7Rnd M200 Magazine": { HQ: { "Ammo (HQ)": 3 } },
      "7.62x39mm 30rnd Sa-58 Mag": { "Non-HQ": { Ammo: 1 } },
      "7.62x51mm 20rnd M14 Mag": { "Non-HQ": { Ammo: 1 } },
      "7.62x51mm 30rnd Mag": { "Non-HQ": { Ammo: 1 } },
      "SR25 7.62x51mm 20rnd": { HQ: { "Ammo (HQ)": 1 } },
      "8rnd .45 ACP": { "Non-HQ": { Ammo: 1 } },
      "9x18mm 8rnd PM Mag": { "Non-HQ": { Ammo: 1 } },
      "9x19mm 15rnd M9 Mag": { "Non-HQ": { Ammo: 1 } },
      "100rnd PK Belt": { "Non-HQ": { Ammo: 1 } },
      "5.56x45mm 200rnd M249 Belt": { HQ: { "Ammo (HQ)": 15 } },
      "5.56x45mm 30rnd AUG Mag": { "Non-HQ": { Ammo: 1 } },
      "5.56x45mm 30rnd STANAG Mag": { "Non-HQ": { Ammo: 1 } },
      "5.45x39mm 30rnd AK Mag": { "Non-HQ": { Ammo: 2 } },
      "5.45x39mm 45rnd RPK-74 Tracer Mag": { HQ: { "Ammo (HQ)": 1 } },
      "7.62x51mm FMJ": { HQ: { "Ammo (HQ)": 1 } },
      "7.62x54mmR 100rnd PK Belt": { HQ: { "Ammo (HQ)": 15 } },
      "7.62x54mmR 10rnd SVD Sniper Mag": { HQ: { "Ammo (HQ)": 1 } },
      "SPEAR 6.8x51 25rnd": { HQ: { "Ammo (HQ)": 1 } },
    },
    Attachments: {
      "4x20 Carry Handle Scope": {
        "Non-HQ": { Component: 41, "Tempered Glass": 18 },
      },
      "4.7mm FlashHider": { "Non-HQ": { Component: 1 } },
      "6.8x51mm FlashHider": {
        "Non-HQ": { Component: 2, "Tempered Glass": 1 },
      },
      "6P20 Muzzle Brake": { "Non-HQ": { Component: 2, "Tempered Glass": 1 } },
      "6P26 Flash Hider": { "Non-HQ": { Component: 2, "Tempered Glass": 1 } },
      "7.62x51mm FlashHider": {
        "Non-HQ": { Component: 3, "Tempered Glass": 1 },
      },
      "A2 Flash Hider": { "Non-HQ": { Component: 2, "Tempered Glass": 1 } },
      "ART II Scope": { "Non-HQ": { Component: 2, "Tempered Glass": 1 } },
      "Carry Handle Red-Dot-Sight": {
        "Non-HQ": { Component: 5, "Tempered Glass": 2 },
      },
      "EOTECH XPS3": { "Non-HQ": { Component: 2, "Tempered Glass": 1 } },
      "Elcan Specter": { "Non-HQ": { Component: 11, "Tempered Glass": 5 } },
      "Leupold VX-6": { "Non-HQ": { Component: 17, "Tempered Glass": 8 } },
      "PSO-1 Scope": { "Non-HQ": { Component: 4, "Tempered Glass": 1 } },
      "Reflex Scope": { "Non-HQ": { Component: 2, "Tempered Glass": 1 } },
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
        "Non-HQ": { "Mechanical Component": 1, "Engine Part": 1 },
      },
      "M151A2 Off-Road Open Top": {
        "Non-HQ": { "Mechanical Component": 1, "Engine Part": 1 },
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
      "6B2 Vest": { "Non-HQ": { "Iron Plate": 10, Cloth: 14 } },
      "6B3 Vest": { HQ: { Kevlar: 7 } },
      "M69 Vest": { "Non-HQ": { "Iron Plate": 10, Cloth: 14 } },
      "PASGT Vest": { "Non-HQ": { "Iron Plate": 10, Cloth: 14 } },
    },
    Helmets: {
      "PASGT Helmet": { "Non-HQ": { "Iron Plate": 2, Cloth: 2 } },
      "PASGT Helmet - Camouflaged": { "Non-HQ": { "Iron Plate": 2, Cloth: 2 } },
      "PASGT Helmet - Camouflaged Netting": {
        "Non-HQ": { "Iron Plate": 2, Cloth: 2 },
      },
      "SPH-4 Helmet": { "Non-HQ": { "Iron Plate": 7, Cloth: 10 } },
      "SSh-68 Helmet": { "Non-HQ": { "Iron Plate": 2, Cloth: 2 } },
      "SSh-68 Helmet - Camouflaged": {
        "Non-HQ": { "Iron Plate": 2, Cloth: 2 },
      },
      "SSh-68 Helmet - Cover": { "Non-HQ": { "Iron Plate": 2, Cloth: 2 } },
      "SSh-68 Helmet - KZS": { "Non-HQ": { "Iron Plate": 2, Cloth: 2 } },
      "SSh-68 Helmet - Netting": { "Non-HQ": { "Iron Plate": 2, Cloth: 2 } },
      "ZSh-5 Helmet": { "Non-HQ": { "Iron Plate": 7, Cloth: 10 } },
    },
    Clothes: {
      "ALICE Medium Backpack": { "Non-HQ": { Cloth: 2 } },
      Bandana: { "Non-HQ": { Cloth: 1 } },
      Balaclava: { "Non-HQ": { Cloth: 1 } },
      "BDU Blouse": { "Non-HQ": { Cloth: 1 } },
      "BDU Blouse - Rolled-up": { "Non-HQ": { Cloth: 1 } },
      "BDU Trousers": { "Non-HQ": { Cloth: 1 } },
      Beanie: { "Non-HQ": { Cloth: 1 } },
      Boonie: { "Non-HQ": { Cloth: 1 } },
      "Cap - All Variants": { "Non-HQ": { Cloth: 1 } },
      "Cargo Pants": { "Non-HQ": { Cloth: 1 } },
      "Cargo Pants (Colored)": { "Non-HQ": { Cloth: 1 } },
      Cardigan: { "Non-HQ": { Cloth: 1 } },
      "Classic Shoe": { "Non-HQ": { Cloth: 2 } },
      "CWU-27 Pilot Coveralls": { "Non-HQ": { Cloth: 20 } },
      Dress: { "Non-HQ": { Cloth: 3 } },
      Fedora: { "Non-HQ": { Cloth: 1 } },
      "Fisher Hat": { "Non-HQ": { Cloth: 1 } },
      "Flat Cap": { "Non-HQ": { Cloth: 1 } },
      "Half Mask": { "Non-HQ": { Cloth: 1 } },
      "Hunting Vest": { "Non-HQ": { Cloth: 1 } },
      "IIFS Large Combat Field Pack": { "Non-HQ": { Cloth: 32 } },
      Jacket: { "Non-HQ": { Cloth: 2 } },
      Jeans: { "Non-HQ": { Cloth: 1 } },
      "Jeans (Colored)": { "Non-HQ": { Cloth: 1 } },
      "KLMK Coveralls": { "Non-HQ": { Cloth: 0 } },
      "Knit Cap": { "Non-HQ": { Cloth: 1 } },
      "Kolobok Backpack": { "Non-HQ": { Cloth: 1 } },
      "M70 Backpack": { "Non-HQ": { Cloth: 2 } },
      "M70 Cap": { "Non-HQ": { Cloth: 1 } },
      "M70 Parka": { "Non-HQ": { Cloth: 2 } },
      "M70 Trousers": { "Non-HQ": { Cloth: 2 } },
      "M88 Field Cap": { "Non-HQ": { Cloth: 1 } },
      "M88 Jacket": { "Non-HQ": { Cloth: 1 } },
      "M88 Jacket - Rolled-up": { "Non-HQ": { Cloth: 1 } },
      "M88 Trousers": { "Non-HQ": { Cloth: 1 } },
      "Mask (Medical)": { "Non-HQ": { Cloth: 1 } },
      "Mask (Latex)": { "Non-HQ": { Cloth: 1 } },
      "Mask (Ski)": { "Non-HQ": { Cloth: 1 } },
      "Officer's Cap": { "Non-HQ": { Cloth: 64 } },
      Panamka: { "Non-HQ": { Cloth: 1 } },
      "Paper Bag": { "Non-HQ": { Cloth: 1 } },
      Polo: { "Non-HQ": { Cloth: 1 } },
      Pullover: { "Non-HQ": { Cloth: 1 } },
      Robe: { "Non-HQ": { Cloth: 7 } },
      "Runner Shoe": { "Non-HQ": { Cloth: 2 } },
      Sneaker: { "Non-HQ": { Cloth: 4 } },
      "Soviet Combat Boots": { "Non-HQ": { Cloth: 1 } },
      "Soviet Pilot Jacket": { "Non-HQ": { Cloth: 11 } },
      "Soviet Pilot Pants": { "Non-HQ": { Cloth: 1 } },
      "Suit Jacket": { "Non-HQ": { Cloth: 61 } },
      "Suit Pants": { "Non-HQ": { Cloth: 50 } },
      Sweater: { "Non-HQ": { Cloth: 1 } },
      "Sweat Pants": { "Non-HQ": { Cloth: 1 } },
      TShirt: { "Non-HQ": { Cloth: 1 } },
      "US Combat Boots": { "Non-HQ": { Cloth: 1 } },
      "Veshmeshok Backpack": { "Non-HQ": { Cloth: 1 } },
      "Wool Hat": { "Non-HQ": { Cloth: 50 } },
    },
    "HQ Components": {
      "Ammo (HQ)": { Resources: { Petrol: 1 }, "Non-HQ": { Ammo: 3 } },
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
      Kevlar: { Resources: { "Iron Plate": 1, "Iron Ingot": 20 } },
    },
    Components: {
      Cloth: { Resources: { Fabric: 1, Polyester: 1 } },
      "Iron Plate": { Resources: { "Iron Ingot": 1, Fabric: 1, Polyester: 1 } },
      Component: { Resources: { "Iron Ingot": 1, "Copper Ingot": 1 } },
      "Tempered Glass": { Resources: { Glass: 2, Polyester: 1 } },
      "Weapon Part": { Resources: { "Iron Ingot": 1, "Copper Ingot": 1 } },
      Stabilizer: { Resources: { "Iron Ingot": 2, "Gold Ingot": 1 } },
      "Attachment Part": {
        Resources: { "Copper Ingot": 2, "Silver Ingot": 1 },
      },
      Ammo: { Resources: { "Iron Ingot": 1, Charcoal: 1 } },
      "Mechanical Component": {
        Resources: { "Iron Ingot": 2, "Copper Ingot": 2 },
      },
      "Engine Part": {
        Resources: { "Iron Ingot": 1, "Copper Ingot": 1, Petrol: 1 },
      },
      "Interior Part": { Resources: { Fabric: 2, Polyester: 2 } },
      Rotor: { Resources: { Charcoal: 1, Polyester: 1 } },
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
      "Copper Ingot": 16,
    },
    "Special Rotor": { "Special Rotor": 1 },
    "Special Gun Barrel": { "Special Gun Barrel": 1 },
  };

  const resourcesList = [
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

  // Crafting times in seconds
  const craftingTimes: { [key: string]: number } = {
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

    // Weapons Time
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

    // Magazines Time
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

    // Attachments Time
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

    // Vehicles Time
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

    // Vests Time
    "6B2 Vest": 40,
    "6B3 Vest": 40,
    "M69 Vest": 40,
    "PASGT Vest": 40,

    // Helmets Time
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

    // Clothing Time
    "ALICE Medium Backpack": 4,
    Bandana: 20,
    Balaclava: 20,
    "BDU Blouse": 20,
    "BDU Blouse - Rolled-up": 20,
    "BDU Trousers": 20,
    Beanie: 20,
    Boonie: 20,
    "Cap - All Variants": 20,
    "Cargo Pants": 20,
    "Cargo Pants (Colored)": 20,
    Cardigan: 20,
    "Classic Shoe": 20,
    "CWU-27 Pilot Coveralls": 20,
    Dress: 20,
    Fedora: 20,
    "Fisher Hat": 20,
    "Flat Cap": 20,
    "Half Mask": 20,
    "Hunting Vest": 20,
    "IIFS Large Combat Field Pack": 20,
    Jacket: 20,
    Jeans: 20,
    "Jeans (Colored)": 20,
    "KLMK Coveralls": 20,
    "Knit Cap": 20,
    "Kolobok Backpack": 20,
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

  // Load user blueprints and populate items
  useEffect(() => {
    const loadBlueprints = async () => {
      if (selectedCategory === "--" || !itemsByCategory[selectedCategory]) {
        setAvailableItems([]);
        return;
      }

      const allItems = itemsByCategory[selectedCategory] || [];

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

  // Helper functions
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

      if (isComponent && sub) {
        componentsMap[compName] = (componentsMap[compName] || 0) + qty;
      }

      if (!sub) {
        localMap[compName] = (localMap[compName] || 0) + qty;
        return;
      }

      for (const [subName, subQty] of Object.entries(sub)) {
        helper(subName, subQty * qty);
      }
    };

    helper(componentName, quantity);
    return { resources: localMap, components: componentsMap };
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
        totalResources[resource] =
          (totalResources[resource] || 0) + resourceQuantity;
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

  const calculateMaterialRuns = (totalResources: { [key: string]: number }) => {
    let vehicleCap = 0;
    const vehicleData = storageOptions.vehicles[selectedVehicle];
    if (vehicleData !== undefined) {
      vehicleCap =
        typeof vehicleData === "number"
          ? vehicleData
          : vehicleData.canisters || 0;
    }

    const backpackCap = storageOptions.backpacks[selectedBackpack] || 0;
    const totalCap = vehicleCap + backpackCap;

    let totalRawResources = 0;
    let totalRuns = 0;
    const runDetails: { [key: string]: number } = {};

    for (const [resource, amount] of Object.entries(totalResources)) {
      if (resourcesList.includes(resource)) {
        const runsNeeded = totalCap > 0 ? Math.ceil(amount / totalCap) : 0;
        runDetails[resource] = runsNeeded;
        totalRawResources += amount;
        totalRuns += runsNeeded;
      }
    }

    return {
      runDetails,
      totalRuns,
      totalRawResources,
      totalCap,
      vehicle: selectedVehicle,
      backpack: selectedBackpack,
    };
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
          totalResources[resource] =
            (totalResources[resource] || 0) + resourceQuantity;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* App Container */}
          <div className="bg-background-secondary/80 backdrop-blur-lg border border-white/5 rounded-2xl p-8 shadow-2xl">
            {/* Title Bar */}
            <div className="flex justify-between items-center mb-8 flex-wrap">
              <h1 className="text-3xl font-bold text-primary-500 flex items-center">
                Crafting Calculator
                <span className="ml-2 text-xs bg-primary-500 text-black px-1.5 py-0.5 rounded font-bold">
                  v2
                </span>
              </h1>
            </div>

            {/* Form Section */}
            <div className="space-y-6">
              {/* Show All Blueprints Toggle */}
              <div className="flex items-center justify-between">
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

              {/* Category Selection */}
              <div>
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
                  className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                >
                  <option value="--">--</option>
                  {Object.keys(itemsByCategory).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Selection */}
              <div>
                <label
                  htmlFor="items"
                  className="block text-white/90 font-medium mb-2"
                >
                  Select Item:
                </label>
                <div className="flex gap-4">
                  <select
                    id="items"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    disabled={selectedCategory === "--"}
                    className="flex-1 p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Choose an item...</option>
                    {availableItems.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center px-4 font-semibold text-white/90">
                    Crafting Level:{" "}
                    {selectedItem
                      ? craftingLevels[selectedItem] ?? "N/A"
                      : "N/A"}
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
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
                  className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              {/* Transport Kit */}
              <div>
                <h3 className="text-primary-500 text-xl font-semibold mb-4">
                  Your Transport Kit
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="vehicleSelect"
                      className="block text-white/90 font-medium mb-2"
                    >
                      Select Transport Vehicle:
                    </label>
                    <select
                      id="vehicleSelect"
                      value={selectedVehicle}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                      className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                    >
                      <option value="">-- Select Vehicle --</option>
                      {Object.keys(storageOptions.vehicles).map((vehicle) => (
                        <option key={vehicle} value={vehicle}>
                          {vehicle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
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
                      className="w-full p-3 bg-background-tertiary border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                    >
                      <option value="">-- Select Backpack --</option>
                      {Object.keys(storageOptions.backpacks).map((backpack) => (
                        <option key={backpack} value={backpack}>
                          {backpack}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={calculateResources}
                  className="w-full p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:scale-105"
                >
                  Calculate Materials
                </button>
                <button
                  onClick={addToKit}
                  className="w-full p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:scale-105"
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
                      Runs Needed
                    </h2>
                    {results.materialRuns.totalCap === 0 ? (
                      <p className="text-red-400">
                        Please select a valid transport vehicle and backpack.
                      </p>
                    ) : (
                      <div>
                        {Object.entries(results.materialRuns.runDetails).map(
                          ([resource, runs]) => (
                            <div key={resource} className="text-white/90">
                              {resource}: {runs} run(s)
                            </div>
                          )
                        )}
                        <div className="mt-4 font-semibold text-white">
                          You will need{" "}
                          <strong>{results.materialRuns.totalRuns}</strong>{" "}
                          run(s) to transport{" "}
                          <strong>
                            {results.materialRuns.totalRawResources}
                          </strong>{" "}
                          raw resources using{" "}
                          <strong>{results.materialRuns.vehicle}</strong> and{" "}
                          <strong>{results.materialRuns.backpack}</strong>.
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
              <p>Updated | June 14, 2025</p>
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
    </div>
  );
}
