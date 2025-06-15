import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Imprint - A-List ELAN Hub',
  description: 'Legal information and site ownership details for A-List ELAN Hub',
}

export default function ImprintLayout({
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