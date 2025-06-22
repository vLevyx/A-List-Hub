import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Middleman Market',
  description: 'Request a trusted middleman for secure trades in ELAN Life',
}

export default function MiddlemanLayout({
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