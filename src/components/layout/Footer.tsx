import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-background-secondary/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-white/70">
            Made with ❤️ by Levy | ELAN: v.0.8.0
          </p>
          <p className="text-white/50 text-sm mt-2">
            &copy; {currentYear} The A-List. All rights reserved.
          </p>
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
        </div>
      </div>
    </footer>
  )
}
