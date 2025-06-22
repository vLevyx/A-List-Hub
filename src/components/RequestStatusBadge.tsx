'use client'

import { RequestStatus } from '@/lib/requestStatus'

interface RequestStatusBadgeProps {
  status: RequestStatus
  className?: string
}

export function RequestStatusBadge({ status, className = '' }: RequestStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      emoji: '🟡',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300'
    },
    claimed: {
      label: 'Claimed',
      emoji: '🟠',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-300'
    },
    completed: {
      label: 'Completed',
      emoji: '🟢',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300'
    },
    cancelled: {
      label: 'Cancelled',
      emoji: '🔴',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300'
    }
  }

  const config = statusConfig[status]

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span className="mr-1">{config.emoji}</span>
      {config.label}
    </span>
  )
}