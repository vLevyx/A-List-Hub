'use client'

import Link from 'next/link'
import { usePageTracking } from '@/hooks/usePageTracking'

export default function ImprintPage() {
  usePageTracking()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[rgba(30,30,30,0.7)] backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-10 shadow-xl">
        <Link 
          href="/" 
          className="inline-flex items-center text-primary-500 hover:text-primary-400 mb-8 transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center bg-gradient-to-r from-primary-500 to-primary-600 text-transparent bg-clip-text">
          Imprint
        </h1>

        <div className="space-y-8 text-white/80">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Team Overview</h2>
            <p><strong>Group Name:</strong> The A-List</p>
            <p><strong>Founders:</strong> Levy & Mike</p>
            <p><strong>Staff Member:</strong> Alexa</p>
            <p><strong>Location:</strong> United States (Global Community)</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              If you need to get in touch with us regarding The A-List or our platform, please reach out via our Discord server:
            </p>
            <a
              href="https://discord.gg/9HaxJmPSpH"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded transition"
            >
              Join Our Discord
            </a>
            <p className="mt-2 text-sm">Or message: <strong>vLevyx</strong> on Discord</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Content Responsibility</h2>
            <p>
              The founders of The A-List are responsible for the content shared on this platform. We strive to provide accurate and up-to-date information, but we make no guarantees about completeness or reliability. Any issues should be reported through our Discord server.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">External Links</h2>
            <p>
              Our website may contain links to external websites. We have no control over the content or policies of those sites and are not responsible for them. If any links violate community standards or laws, please notify us so we can review and remove them as necessary.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Copyright</h2>
            <p>
              All original content, including tools, designs, and branding associated with The A-List, is protected under applicable intellectual property laws. Unauthorized use or distribution is not permitted. If you believe any material infringes your rights, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Jurisdiction</h2>
            <p>
              This site is operated from the United States. By using it, you agree that any disputes will be governed by applicable U.S. laws. We aim to accommodate users globally, including from the EU and UK, and make reasonable efforts to comply with international norms.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 text-white/60 text-sm text-center">
            Last Updated: June 15, 2025
          </div>
        </div>
      </div>
    </div>
  )
}
