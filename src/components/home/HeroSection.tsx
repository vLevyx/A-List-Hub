'use client'

import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { FeatureCard } from './FeatureCard'

const features = [
  {
    title: 'Crafting Calculator',
    href: '/calculator',
    requiresAccess: true,
    tag: 'Updated!',
    tagType: 'updated' as const
  },
  {
    title: 'Price Planner',
    href: '/price',
    requiresAccess: true,
    tag: 'New!',
    tagType: 'new' as const
  },
  {
    title: 'Weapon Compatibility',
    href: '/weapon-compatibility',
    requiresAccess: true,
    tag: 'Updated!',
    tagType: 'updated' as const
  },
  {
    title: 'Vehicle Overview',
    href: '/vehicle-overview',
    requiresAccess: false
  },
  {
    title: 'OverFuel+',
    href: '/overfuel',
    requiresAccess: true,
    tag: 'New!',
    tagType: 'new' as const
  },
  {
    title: 'Code Lock Solver',
    href: '/codelock',
    requiresAccess: true
  },
  {
    title: 'ELAN Server Status',
    href: '/server-status',
    requiresAccess: false,
    tag: 'New!',
    tagType: 'new' as const
  },
  {
    title: 'Freshie Guide',
    href: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3194800812',
    requiresAccess: false,
    external: true
  }
]

export function HeroSection() {
  const { hasAccess } = useAuth()

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-background-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold text-primary-500 mb-4"
          >
            A-List ELAN Hub
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/90 mb-8"
          >
            <strong>Everything</strong> you need, <strong>nothing</strong> you don't.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              >
                <FeatureCard
                  {...feature}
                  hasAccess={hasAccess}
                />
              </motion.div>
            ))}
          </motion.div>

          {!hasAccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8"
            >
              <a
                href="/whitelist"
                className="inline-block bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold py-4 px-8 rounded-xl text-lg hover:from-yellow-500 hover:to-yellow-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                🔓 Unlock Plus Features
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}