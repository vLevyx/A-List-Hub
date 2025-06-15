'use client'

import { motion } from 'framer-motion'

export function AboutSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary-500 mb-6">About A-List</h2>
        <div className="space-y-4 text-white/90 text-lg leading-relaxed">
          <p>
            <strong>A-List is a community-driven hub built by players, for players</strong> — designed to make your ELAN Life experience smarter, smoother, and more immersive.
          </p>
          <p>
            What began as a simple idea has grown into a fully-loaded toolkit, <strong>shaped by the voices of our team and our community</strong>. Our Crafting Calculator stands at the center — a feature-rich, constantly evolving tool built from the ground up.
          </p>
          <p>
            <strong>A-List runs on passion and teamwork</strong>. We're not just building tools — we're living the game alongside you, here to make sure you always have the support and edge to enjoy ELAN to the fullest.
          </p>
        </div>
      </div>
    </motion.section>
  )
}