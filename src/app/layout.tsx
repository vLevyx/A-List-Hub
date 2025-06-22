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
      <head>
        {/* ADD THIS CRITICAL CSS: */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
            .from-background-primary { --tw-gradient-from: #121212; --tw-gradient-to: rgba(18, 18, 18, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
            .via-background-secondary { --tw-gradient-to: rgba(26, 26, 26, 0); --tw-gradient-stops: var(--tw-gradient-from), #1a1a1a, var(--tw-gradient-to); }
            .text-primary-500 { color: #00c6ff; }
            .min-h-screen { min-height: 100vh; }
          `
        }} />
      </head>
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