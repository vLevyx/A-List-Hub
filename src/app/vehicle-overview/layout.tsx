import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vehicle Overview',
  description: 'Comprehensive vehicle information and pricing for ELAN Life',
}

export default function VehicleOverviewLayout({
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