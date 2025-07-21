import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parcel Route Planner - A-List Hub',
  description: 'Optimize your parcel delivery routes across Everon Island for maximum efficiency and profit in Arma Reforger.',
  keywords: 'Arma Reforger, Everon, parcel delivery, route optimization, route planner, gaming tools',
  openGraph: {
    title: 'Parcel Route Planner - A-List Hub',
    description: 'Optimize your parcel delivery routes across Everon Island for maximum efficiency and profit.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parcel Route Planner - A-List Hub',
    description: 'Optimize your parcel delivery routes across Everon Island for maximum efficiency and profit.',
  },
}

export default function ParcelLayout({
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