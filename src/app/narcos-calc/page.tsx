"use client";

import { useState, useEffect } from 'react';
import { ChevronDown, Package, Clock, Zap, AlertCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTracking } from '@/hooks/usePageTracking';

const PURPLE_PRIMARY = '#8b5cf6';

interface ComponentRequirement {
  [componentName: string]: number;
}

interface ItemComponentData {
  Resources?: ComponentRequirement;
}

interface ItemComponents {
  [category: string]: {
    [itemName: string]: ItemComponentData;
  };
}

interface CalculationResults {
  item: string;
  quantity: number;
  baseResources: { [key: string]: number };
  totalTime: number;
  totalXP: number;
  craftingLevel: number;
}

const itemsByCategory = {
  "Weapon Parts": ["Steel barrel", "Steel receiver", "Firing pin", "Grip", "Slide", "Stock", "Trigger", "Hardened firing pin"],
  "Rifles": ["AKS74U", "AK47", "Spectre"],
  "Handguns": ["Desert eagle"],
  "Magazines": ["Desert eagle magazine", "AK magazine", "Spectre Magazine", "Spectre Drum Magazine"],
  "Armor": ["Ballistic vest"],
  "Materials": ["Steel bar", "Gunpowder", "Sulfer", "Steel plate"]
};

const itemComponents: ItemComponents = {
  "Weapon Parts": {
    "Steel barrel": { Resources: { "Steel bar": 12 } },
    "Steel receiver": { Resources: { "Steel bar": 12 } },
    "Firing pin": { Resources: { "Iron bar": 2, "Copper bar": 2, "Coal": 1 } },
    "Grip": { Resources: { "Copper bar": 2, "Iron bar": 2 } },
    "Slide": { Resources: { "Iron bar": 2 } },
    "Stock": { Resources: { "Copper bar": 2 } },
    "Trigger": { Resources: { "Iron bar": 2, "Copper bar": 2 } },
    "Hardened firing pin": { Resources: { "Diamond": 10, "Firing pin": 1, "Steel bar": 1 } }
  },
  "Rifles": {
    "AKS74U": { Resources: { "Steel barrel": 3, "Steel receiver": 3, "Hardened firing pin": 1, "Grip": 2, "Slide": 2, "Stock": 2, "Trigger": 1 } },
    "AK47": { Resources: { "Steel barrel": 4, "Steel receiver": 4, "Hardened firing pin": 1, "Grip": 2, "Stock": 3, "Trigger": 1 } },
    "Spectre": { Resources: { "Steel barrel": 2, "Steel receiver": 3, "Firing pin": 1, "Grip": 1, "Slide": 1, "Stock": 1, "Trigger": 1 } }
  },
  "Handguns": {
    "Desert eagle": { Resources: { "Steel barrel": 1, "Steel receiver": 1, "Firing pin": 1, "Grip": 1, "Slide": 1, "Stock": 1, "Trigger": 1 } }
  },
  "Magazines": {
    "Desert eagle magazine": { Resources: { "Gunpowder": 3, "Iron bar": 1 } },
    "AK magazine": { Resources: { "Gunpowder": 5, "Iron bar": 1 } },
    "Spectre Magazine": { Resources: { "Gunpowder": 5, "Iron bar": 1 } },
    "Spectre Drum Magazine": { Resources: { "Gunpowder": 10, "Iron bar": 5 } }
  },
  "Armor": {
    "Ballistic vest": { Resources: { "Steel plate": 24 } }
  },
  "Materials": {
    "Steel bar": { Resources: { "Iron bar": 2, "Coal": 1 } },
    "Gunpowder": { Resources: { "Saltpeter": 2, "Sulfer": 1 } },
    "Sulfer": { Resources: { "Coal": 2 } },
    "Steel plate": { Resources: { "Steel bar": 10 } }
  }
};

const craftingLevels: { [key: string]: number } = {
  "Steel barrel": 0, "Steel receiver": 0, "Firing pin": 0, "Grip": 0, "Slide": 0, "Stock": 0, "Trigger": 0, "Hardened firing pin": 0,
  "AKS74U": 5, "AK47": 8, "Spectre": 4, "Desert eagle": 1,
  "Desert eagle magazine": 0, "AK magazine": 0, "Spectre Magazine": 0, "Spectre Drum Magazine": 10,
  "Ballistic vest": 10, "Steel bar": 0, "Gunpowder": 0, "Sulfer": 0, "Steel plate": 0
};

const craftingTimes: { [key: string]: number } = {
  "Steel barrel": 8, "Steel receiver": 8, "Firing pin": 8, "Grip": 8, "Slide": 8, "Stock": 8, "Trigger": 8, "Hardened firing pin": 16,
  "AKS74U": 30, "AK47": 30, "Spectre": 30, "Desert eagle": 30,
  "Desert eagle magazine": 8, "AK magazine": 8, "Spectre Magazine": 8, "Spectre Drum Magazine": 30,
  "Ballistic vest": 60, "Steel bar": 4, "Gunpowder": 2, "Sulfer": 4, "Steel plate": 16
};

const craftingXP: { [key: string]: number } = {
  "Steel barrel": 10, "Steel receiver": 10, "Firing pin": 4, "Grip": 4, "Slide": 4, "Stock": 4, "Trigger": 4, "Hardened firing pin": 8,
  "AKS74U": 200, "AK47": 300, "Spectre": 175, "Desert eagle": 150,
  "Desert eagle magazine": 20, "AK magazine": 20, "Spectre Magazine": 20, "Spectre Drum Magazine": 10,
  "Ballistic vest": 250, "Steel bar": 5, "Gunpowder": 10, "Sulfer": 4, "Steel plate": 20
};

export default function NarcosCalculatorPage() {
  usePageTracking();
  const { hasAccess, loading, user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const collectBaseResources = (itemName: string, quantity: number): { [key: string]: number } => {
    const resources: { [key: string]: number } = {};
    
    let itemData: ItemComponentData | undefined;
    for (const category of Object.keys(itemComponents)) {
      if (itemComponents[category][itemName]) {
        itemData = itemComponents[category][itemName];
        break;
      }
    }
    
    if (!itemData || !itemData.Resources) {
      resources[itemName] = quantity;
      return resources;
    }
    
    for (const [resourceName, resourceQty] of Object.entries(itemData.Resources)) {
      const totalResourceNeeded = resourceQty * quantity;
      const subResources = collectBaseResources(resourceName, totalResourceNeeded);
      
      for (const [subResourceName, subResourceQty] of Object.entries(subResources)) {
        resources[subResourceName] = (resources[subResourceName] || 0) + subResourceQty;
      }
    }
    
    return resources;
  };

  const calculateMaterials = () => {
    if (!selectedItem || quantity <= 0) {
      setResults(null);
      return;
    }
    
    setIsCalculating(true);
    
    setTimeout(() => {
      const baseResources = collectBaseResources(selectedItem, quantity);
      
      const calculateTotalTime = (itemName: string, qty: number): number => {
        let totalTime = (craftingTimes[itemName] || 0) * qty;
        
        let itemData: ItemComponentData | undefined;
        for (const category of Object.keys(itemComponents)) {
          if (itemComponents[category][itemName]) {
            itemData = itemComponents[category][itemName];
            break;
          }
        }
        
        if (itemData && itemData.Resources) {
          for (const [resourceName, resourceQty] of Object.entries(itemData.Resources)) {
            totalTime += calculateTotalTime(resourceName, resourceQty * qty);
          }
        }
        
        return totalTime;
      };
      
      const calculateTotalXP = (itemName: string, qty: number): number => {
        let totalXP = (craftingXP[itemName] || 0) * qty;
        
        let itemData: ItemComponentData | undefined;
        for (const category of Object.keys(itemComponents)) {
          if (itemComponents[category][itemName]) {
            itemData = itemComponents[category][itemName];
            break;
          }
        }
        
        if (itemData && itemData.Resources) {
          for (const [resourceName, resourceQty] of Object.entries(itemData.Resources)) {
            totalXP += calculateTotalXP(resourceName, resourceQty * qty);
          }
        }
        
        return totalXP;
      };
      
      const totalTime = calculateTotalTime(selectedItem, quantity);
      const totalXP = calculateTotalXP(selectedItem, quantity);
      
      setResults({
        item: selectedItem,
        quantity,
        baseResources,
        totalTime,
        totalXP,
        craftingLevel: craftingLevels[selectedItem] || 0
      });
      
      setIsCalculating(false);
    }, 300);
  };

  useEffect(() => {
    if (selectedItem && quantity > 0) {
      calculateMaterials();
    } else {
      setResults(null);
    }
  }, [selectedItem, quantity]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const resetCalculator = () => {
    setSelectedCategory("");
    setSelectedItem("");
    setQuantity(1);
    setResults(null);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="bg-background-secondary/80 backdrop-blur-lg border border-white/5 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            
            <div className="flex justify-between items-center mb-6 sm:mb-8 flex-wrap gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center flex-wrap" style={{ color: PURPLE_PRIMARY }}>
                Crafting Calculator
                <span className="ml-2 text-xs text-black px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: PURPLE_PRIMARY }}>
                  Narcos
                </span>
              </h1>
            </div>

            <div className="space-y-4 sm:space-y-6">

              <div>
                <label className="block text-white/90 font-medium mb-3">Category</label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedItem("");
                      setResults(null);
                    }}
                    className="w-full dark-dropdown"
                  >
                    <option value="">Select Category</option>
                    {Object.keys(itemsByCategory).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/90 font-medium mb-3">Item</label>
                <div className="relative">
                  <select
                    value={selectedItem}
                    onChange={(e) => {
                      setSelectedItem(e.target.value);
                    }}
                    disabled={!selectedCategory}
                    className="w-full dark-dropdown disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Item</option>
                    {selectedCategory && itemsByCategory[selectedCategory as keyof typeof itemsByCategory]?.map((item) => (
                      <option key={item} value={item}>
                        {item} {craftingLevels[item] > 0 && `(Level ${craftingLevels[item]})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/90 font-medium mb-3">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={quantity}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value) || 1;
                    setQuantity(newQuantity);
                  }}
                  className="w-full bg-background-tertiary border border-white/10 rounded-xl px-4 py-3 text-white 
                           focus:outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 
                           transition-all"
                  placeholder="1"
                />
              </div>

              {(selectedCategory || selectedItem || results) && (
                <div className="flex justify-end">
                  <button
                    onClick={resetCalculator}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {(results || isCalculating) && (
            <div className="mt-8 bg-background-secondary/80 backdrop-blur-lg border border-white/5 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
              
              {isCalculating ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-[#8b5cf6] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/70">Calculating materials...</p>
                </div>
              ) : results && (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: PURPLE_PRIMARY }}>
                      Crafting Requirements
                    </h2>
                    <div className="flex justify-center items-center gap-6 text-sm text-gray-400 flex-wrap">
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {results.quantity}x {results.item}
                      </span>
                      {results.craftingLevel > 0 && (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Level {results.craftingLevel} Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resources Needed Section - Exact layout match */}
                  <h2 className="text-xl font-semibold border-b border-gray-600 pb-2 mb-4" style={{ color: PURPLE_PRIMARY }}>
                    Resources Needed
                  </h2>

                  {Object.keys(results.baseResources).length > 0 && (
                    <ul className="space-y-1 mb-6">
                      {Object.entries(results.baseResources)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([resource, amount]) => (
                        <li key={resource} className="text-white/90">
                          {resource}: {(amount as number).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Crafting Time Section - Exact layout match */}
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold border-b border-gray-600 pb-2 mb-4" style={{ color: PURPLE_PRIMARY }}>
                      Estimated Crafting Time
                    </h2>
                    <div className="text-white font-semibold text-lg">
                      {formatTime(results.totalTime)} total
                    </div>
                  </div>

                  {/* Summary Statistics */}
                  <div className="mt-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-blue-300">{Object.keys(results.baseResources).length}</div>
                        <div className="text-sm text-gray-400">Material Types</div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-300">
                          {Object.values(results.baseResources).reduce((a: number, b) => a + (b as number), 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">Total Items</div>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-300">{formatTime(results.totalTime)}</div>
                        <div className="text-sm text-gray-400">Crafting Time</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-purple-300">{results.totalXP.toLocaleString()}</div>
                        <div className="text-sm text-gray-400">Total XP</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}