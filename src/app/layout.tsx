import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'A-List Hub',
  description: 'Everything you need for ELAN Life - Crafting Calculator, Price Planner, Weapon Compatibility, and more premium tools.',
  keywords: 'ELAN Life, gaming tools, crafting calculator, price planner, weapon compatibility',
  authors: [{ name: 'Levy' }],
  creator: 'The A-List Team',
  openGraph: {
    title: 'A-List Hub',
    description: 'Premium gaming tools for ELAN Life players',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A-List Hub',
    description: 'Premium gaming tools for ELAN Life players',
  },
  robots: {
    index: true,
    follow: true,
  },
  // viewport configuration removed from here
}

// Separate viewport export (this is the new Next.js way)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}