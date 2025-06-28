import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'OverFuel+',
  description: 'Complete directory of fuel stations, harbors, and service points across the map. Find locations, view maps, and plan your routes efficiently.',
  keywords: ['fuel stations', 'harbors', 'airport', 'route planning', 'map directory'],
  authors: [{ name: 'A-List Hub' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'OverFuel+ | Station Directory',
    description: 'Complete directory of fuel stations, harbors, and service points across the map.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function OverFuelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Preload critical images */}
      <link rel="preload" href="/OverFuelMaps/gas1.png" as="image" />
      <link rel="preload" href="/OverFuelMaps/gas2.png" as="image" />
      <link rel="preload" href="/OverFuelMaps/gas3.png" as="image" />
      {children}
    </>
  )
}