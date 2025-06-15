import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  thickness?: 'thin' | 'normal' | 'thick'
}

export function LoadingSpinner({ 
  className, 
  size = 'md', 
  color = 'primary',
  thickness = 'normal'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  const colorClasses = {
    primary: 'border-t-primary-500',
    white: 'border-t-white',
    gray: 'border-t-gray-400'
  }
  
  const thicknessClasses = {
    thin: 'border',
    normal: 'border-2',
    thick: 'border-3'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-white/20',
        sizeClasses[size],
        colorClasses[color],
        thicknessClasses[thickness],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}