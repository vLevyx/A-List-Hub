import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: CardProps) {
  return (
    <h3
      className={cn('text-2xl font-semibold leading-none tracking-tight text-white', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: CardProps) {
  return (
    <p
      className={cn('text-sm text-white/70', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: CardProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
}