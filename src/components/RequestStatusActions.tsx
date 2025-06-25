"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUsername } from "@/lib/utils";

export type RequestStatus = "pending" | "claimed" | "completed" | "cancelled";

interface RequestStatusActionsProps {
  requestId: string;
  currentStatus: RequestStatus;
  userDiscordId: string;
  requestOwnerDiscordId: string;
  claimedBy?: string;
  onStatusUpdated?: () => void;
}

export function RequestStatusActions({
  requestId,
  currentStatus,
  userDiscordId,
  requestOwnerDiscordId,
  claimedBy,
  onStatusUpdated,
}: RequestStatusActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const isOwner = userDiscordId === requestOwnerDiscordId;
  const isClaimer = userDiscordId === claimedBy;

  const updateRequestStatus = async (
    newStatus: RequestStatus,
    claimedBy?: string
  ) => {
    setIsUpdating(true);
    setMessage("");

    try {
      // Get current user session to extract username
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      // Get username instead of Discord ID for claimed_by field
      const claimedByValue = newStatus === "claimed" 
        ? claimedBy || getUsername(user) // Use username instead of userDiscordId
        : undefined;

      const updateData = {
        requestId,
        newStatus,
        claimedBy: claimedByValue,
      };

      // Call the status update edge function
      const { data: result, error } = await supabase.functions.invoke(
        "update-request-status",
        {
          body: updateData,
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to update status");
      }

      if (!result.success) {
        throw new Error(result.error || "Status update failed");
      }

      setMessage(`✅ ${result.message}`);
      onStatusUpdated?.();
    } catch (error: any) {
      console.error("Error updating request status:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if user is admin/middleman
  const [isMiddleman, setIsMiddleman] = useState(false);

  useEffect(() => {
    const checkMiddlemanStatus = async () => {
      try {
        // ✅ FIXED: Changed from "is_admin" to "is_middleman"
        const { data, error } = await supabase.rpc("is_middleman");
        if (error) throw error;
        setIsMiddleman(data === true);
      } catch (error) {
        console.error('Error checking middleman status:', error);
        setIsMiddleman(false);
      }
    };
    checkMiddlemanStatus();
  }, []);

  const handleStatusUpdate = async (action: () => Promise<any>) => {
    setIsUpdating(true);
    setMessage("");
    try {
      await action();
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const claimRequest = () => updateRequestStatus("claimed");
  const completeRequest = () => updateRequestStatus("completed");
  const cancelRequest = () => updateRequestStatus("cancelled");
  const reopenRequest = () => updateRequestStatus("pending");

  const getAvailableActions = () => {
    const actions = [];

    if (currentStatus === "pending") {
      // Only middlemen can claim requests
      if (isMiddleman) {
        actions.push({
          label: "📩 Claim Request",
          action: claimRequest,
          variant: "primary",
        });
      }

      // Owner can cancel
      if (isOwner) {
        actions.push({
          label: "❌ Cancel",
          action: cancelRequest,
          variant: "danger",
        });
      }
    }

    if (currentStatus === "claimed") {
      // Claimer can complete
      if (isClaimer || isMiddleman) {
        actions.push({
          label: "✅ Mark Complete",
          action: completeRequest,
          variant: "success",
        });
      }

      // Owner, claimer, or middleman can unclaim
      if (isOwner || isClaimer || isMiddleman) {
        actions.push({
          label: "↩️ Return to Pending",
          action: reopenRequest,
          variant: "secondary",
        });
      }
    }

    if (currentStatus === "cancelled") {
      // Owner or middleman can reopen
      if (isOwner || isMiddleman) {
        actions.push({
          label: "🔄 Reopen Request",
          action: reopenRequest,
          variant: "primary",
        });
      }
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            disabled={isUpdating}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              action.variant === "primary"
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30"
                : action.variant === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                : action.variant === "danger"
                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                : "bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30"
            } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isUpdating ? "..." : action.label}
          </button>
        ))}
      </div>
      
      {message && (
        <div className={`text-sm ${
          message.startsWith("✅") ? "text-green-400" : "text-red-400"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}