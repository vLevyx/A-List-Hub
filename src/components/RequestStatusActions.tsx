"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
      const updateData = {
        requestId,
        newStatus,
        claimedBy:
          newStatus === "claimed" ? claimedBy || userDiscordId : undefined,
      };

      // Call the status update edge function
      const { data: result, error } = await supabase.functions.invoke(
        "update-request-status",
        {
          body: updateData,
          headers: {
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
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

  const getButtonClasses = (variant: string) => {
    const baseClasses =
      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    switch (variant) {
      case "primary":
        return `${baseClasses} bg-[#00c6ff] text-black hover:bg-[#00a8d8]`;
      case "success":
        return `${baseClasses} bg-green-500 text-white hover:bg-green-600`;
      case "danger":
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600`;
      case "secondary":
        return `${baseClasses} bg-white/10 text-white hover:bg-white/20 border border-white/20`;
      default:
        return `${baseClasses} bg-gray-500 text-white hover:bg-gray-600`;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleStatusUpdate(action.action)}
            disabled={isUpdating}
            className={getButtonClasses(action.variant)}
          >
            {isUpdating ? "Updating..." : action.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="text-sm p-2 rounded bg-white/5 border border-white/10 text-white/90">
          {message}
        </div>
      )}
    </div>
  );
}
