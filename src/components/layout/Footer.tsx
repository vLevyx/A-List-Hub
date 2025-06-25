// components/layout/Footer.tsx
import Link from 'next/link'
import { APP_VERSION, LAST_UPDATED, ELAN_VERSION } from '../../lib/version'

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t border-white/10 bg-background-secondary/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-white/70">
            Made with ❤️ by Levy | ELAN: {ELAN_VERSION}
          </p>
          <p className="text-white/50 text-sm mt-2">
            &copy; {currentYear} The A-List. All rights reserved.
          </p>
          
          {/* Version Information */}
          <div className="text-white/40 text-xs mt-2">
            A-List Hub v{APP_VERSION} | Last Updated: {LAST_UPDATED}
          </div>
          
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-white/60 hover:text-white transition"
            >
              Privacy Policy
            </Link>
            <span className="text-white/40">|</span>
            <Link
              href="/imprint"
              className="text-white/60 hover:text-white transition"
            >
              Imprint
            </Link>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-white/30 text-xs">
              For the Community, by the Community | Not Affiliated with ELAN Life
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
