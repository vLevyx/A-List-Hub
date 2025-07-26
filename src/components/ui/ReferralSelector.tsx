// components/ui/ReferralSelector.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/timeout";
import { useAuth } from "@/hooks/useAuth";
import { getDiscordId } from "@/lib/utils";

interface User {
  discord_id: string;
  username: string | null;
}

interface ReferralSelectorProps {
  value: string;
  onChange: (value: string, discordId?: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ReferralSelector({
  value,
  onChange,
  disabled = false,
  className = "",
}: ReferralSelectorProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedDiscordId, setSelectedDiscordId] = useState<string>("");
  const [isValidSelection, setIsValidSelection] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const supabase = createClient();

  // Get current user's Discord ID to exclude from results
  const currentUserDiscordId = user ? getDiscordId(user) : null;

  // Test function to check database access
  const testDatabaseAccess = useCallback(async () => {
    console.log("🧪 Testing database access...");
    
    try {
      // Test 1: Basic count query
      const { count: totalCount, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });
      
      console.log("🧪 Total users count:", totalCount, "Error:", countError);

      // Test 2: Simple select query
      const { data: simpleData, error: simpleError } = await supabase
        .from("users")
        .select("discord_id, username")
        .limit(5);
      
      console.log("🧪 Simple select:", simpleData, "Error:", simpleError);

      // Test 3: Search for your specific user
      const { data: specificUser, error: specificError } = await supabase
        .from("users")
        .select("discord_id, username")
        .eq("discord_id", currentUserDiscordId);
      
      console.log("🧪 Your user data:", specificUser, "Error:", specificError);

      // Test 4: Search for vl pattern
      const { data: searchData, error: searchError } = await supabase
        .from("users")
        .select("discord_id, username")
        .ilike("username", "%vl%");
      
      console.log("🧪 VL search results:", searchData, "Error:", searchError);

    } catch (error) {
      console.error("🧪 Database test failed:", error);
    }
  }, [supabase, currentUserDiscordId]);

  // Run test on component mount (for debugging)
  useEffect(() => {
    if (currentUserDiscordId) {
      testDatabaseAccess();
    }
  }, [currentUserDiscordId, testDatabaseAccess]);

  // Debounced search function
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    console.log("🔍 Starting search for:", query.trim());
    console.log("🔍 Current user Discord ID:", currentUserDiscordId);
    
    setIsLoading(true);
    try {
      // Start with a basic query and build up
      let supabaseQuery = supabase
        .from("users")
        .select("discord_id, username");

      // First, let's see all users with usernames
      console.log("🔍 Building query...");
      
      // Filter for users with usernames (not null and not empty)
      supabaseQuery = supabaseQuery
        .not("username", "is", null)
        .neq("username", "");

      // Add the search filter
      supabaseQuery = supabaseQuery.ilike("username", `%${query.trim()}%`);

      // Exclude current user from results
      if (currentUserDiscordId) {
        supabaseQuery = supabaseQuery.neq("discord_id", currentUserDiscordId);
        console.log("🔍 Excluding current user:", currentUserDiscordId);
      }

      // Add ordering and limit
      supabaseQuery = supabaseQuery
        .order("username", { ascending: true })
        .limit(15); // Increased limit for debugging

      console.log("🔍 Executing query...");
      const { data, error } = await withTimeout(supabaseQuery, 8000);

      console.log("🔍 Query response:", { data, error });

      if (error) {
        console.error("❌ Error searching users:", error);
        console.error("❌ Error details:", error.message, error.code, error.details);
        setSuggestions([]);
        return;
      }

      // Log the raw data
      console.log("🔍 Raw data received:", data);
      console.log("🔍 Number of results:", data?.length || 0);

      // Additional client-side filter to ensure current user is excluded
      const filteredData = (data || []).filter(
        (userData) => {
          const isCurrentUser = userData.discord_id === currentUserDiscordId;
          const hasUsername = userData.username && userData.username.trim() !== "";
          console.log(`🔍 User ${userData.username} (${userData.discord_id}):`, {
            isCurrentUser,
            hasUsername,
            included: !isCurrentUser && hasUsername
          });
          return !isCurrentUser && hasUsername;
        }
      );

      console.log("🔍 Filtered results:", filteredData);
      console.log("🔍 Final suggestions count:", filteredData.length);

      setSuggestions(filteredData);
    } catch (error) {
      console.error("❌ Search timeout or error:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, currentUserDiscordId]);

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      setSelectedIndex(-1);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // If input is cleared, reset everything
      if (!newValue.trim()) {
        setSuggestions([]);
        setIsOpen(false);
        setSelectedDiscordId("");
        setIsValidSelection(false);
        onChange("", "");
        return;
      }

      // If user is typing after having selected someone, clear the selection
      if (selectedDiscordId || isValidSelection) {
        setSelectedDiscordId("");
        setIsValidSelection(false);
      }

      // Set new timeout for search
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(newValue);
        setIsOpen(true);
      }, 300);

      // Update parent with current text value (clear Discord ID since they're typing)
      onChange(newValue, "");
    },
    [searchUsers, onChange, selectedDiscordId, isValidSelection]
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (userData: User) => {
      const username = userData.username || `User ${userData.discord_id}`;
      setSearchTerm(username);
      setSelectedDiscordId(userData.discord_id);
      setIsValidSelection(true);
      setIsOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
      
      // Clear any pending search timeouts to prevent searching after selection
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      onChange(username, userData.discord_id);

      // Focus back to input for accessibility
      inputRef.current?.focus();
    },
    [onChange]
  );

  // Handle input focus - only show dropdown if we don't have a selected user
  const handleInputFocus = useCallback(() => {
    // Only show existing suggestions if we don't have a valid selection
    if (suggestions.length > 0 && !isValidSelection) {
      setIsOpen(true);
    }
  }, [suggestions.length, isValidSelection]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === "ArrowDown" && suggestions.length === 0 && searchTerm.trim().length >= 2) {
          searchUsers(searchTerm);
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;

        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSuggestionSelect(suggestions[selectedIndex]);
          }
          break;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;

        case "Tab":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, selectedIndex, handleSuggestionSelect, searchTerm, searchUsers]
  );

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        placeholder="Type to search Discord usernames..."
        disabled={disabled}
        className="w-full p-4 sm:p-5 rounded-xl border-2 border-white/20 bg-black/40 text-white text-base sm:text-lg backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-4 focus:ring-[#ffd700]/20 transition-all duration-300 placeholder-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-describedby="referral-help"
        role="combobox"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#ffd700]" />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && !isValidSelection && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((userData, index) => (
            <div
              key={userData.discord_id}
              className={`px-4 py-3 cursor-pointer transition-all duration-200 border-b border-white/10 last:border-b-0 ${
                index === selectedIndex
                  ? "bg-[#ffd700]/20 text-[#ffd700]"
                  : "text-white/90 hover:bg-white/5"
              }`}
              onClick={() => handleSuggestionSelect(userData)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#ffd700] to-[#ffc400] rounded-full flex items-center justify-center text-black font-bold text-sm">
                  {userData.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <div className="font-medium">
                    {userData.username || `User ${userData.discord_id.slice(0, 8)}...`}
                  </div>
                  <div className="text-xs text-white/60">
                    ID: {userData.discord_id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Valid selection confirmation */}
      {isValidSelection && selectedDiscordId && (
        <div className="w-full mt-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 backdrop-blur-xl rounded-xl shadow-2xl p-4">
          <div className="flex items-center gap-3 text-green-300">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="font-medium">✅ Discord username found in A-List Hub users database</div>
              <div className="text-xs text-green-300/80 mt-1">Referral tracking will be applied</div>
            </div>
          </div>
        </div>
      )}

      {/* No results message - only show when actively searching and no valid selection */}
      {isOpen && !isLoading && searchTerm.length >= 2 && suggestions.length === 0 && !isValidSelection && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 text-center text-white/70"
        >
          {currentUserDiscordId ? 
            `No other users found matching "${searchTerm}"` :
            `No users found matching "${searchTerm}"`
          }
        </div>
      )}

      {/* Help text */}
      <div id="referral-help" className="mt-2 text-white/60 text-sm">
        {isValidSelection ? (
          "✅ Valid referral selected"
        ) : searchTerm.length < 2 && searchTerm.length > 0 ? (
          "Type at least 2 characters to search"
        ) : (
          "Start typing to see Discord username suggestions"
        )}
      </div>
    </div>
  );
}