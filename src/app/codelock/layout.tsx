import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Code Lock Solver',
  description: 'Solve code lock puzzles for ELAN Life fuel station robberies',
}

export default function CodeLockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}