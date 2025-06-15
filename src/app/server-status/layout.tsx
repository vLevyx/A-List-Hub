import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ELAN Life Servers - Live Status',
  description: 'Real-time status dashboard for ELAN Life game servers',
}

export default function ServerStatusLayout({
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