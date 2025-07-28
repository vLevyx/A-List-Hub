import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Narcos Calculator',
  description: 'Narcos Life Calculator - Calculate crafting requirements, materials, time, and XP for weapons, armor, and items',
  keywords: 'narcos, calculator, crafting, weapons, materials, gaming, roleplay',
  authors: [{ name: 'The A-List' }],
  creator: 'Narcos Calc',
  publisher: 'Narcos Calc',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Narcos Crafting Calculator',
    description: 'Calculate crafting requirements, materials, time, and XP for Narcos Life weapons, armor, and items',
    siteName: 'Narcos Calc',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Narcos Crafting Calculator',
    description: 'Calculate crafting requirements, materials, time, and XP for Narcos Life weapons, armor, and items',
  },
  other: {
    'theme-color': '#8b5cf6',
    'color-scheme': 'dark',
  },
}

export default function NarcosCalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main role="main">
      {children}
    </main>
  )
}