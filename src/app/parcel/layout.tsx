import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parcel Route Planner',
  description: 'Optimize your parcel delivery routes across Everon.',
  keywords: 'Arma Reforger, Everon, parcel delivery, route optimization, route planner, gaming tools',
  openGraph: {
    title: 'Parcel Route Planner',
    description: 'Optimize your parcel delivery routes across Everon.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parcel Route Planner',
    description: 'Optimize your parcel delivery routes across Everon.',
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