import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OverFuel+ - A-List ELAN Hub',
  description: 'Comprehensive fuel station directory for ELAN Life',
}

export default function OverFuelLayout({
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