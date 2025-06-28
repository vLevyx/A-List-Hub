'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const tips = [
  "Always lock your vehicle to prevent theft!",
  "Combine your backpack and trunk to get more capacity during gathering.",
  "Start at the copper mine north of Montignac for a low-risk, high-return start.",
  "Always smelt ores before selling. Raw ore has no value",
  "Group up to run high-volume ore trips or protect each other from gangs — safer and faster.",
  "Use T (On PC) for push-to-talk. Good comms can defuse tense RP moments.",
  "A Positive+++ reputation gives you up to 19% OFF market purchases!",
  "Avoid RDM, VDM, CL, and Metagaming — all bannable offenses. Read the rules!",
  "No tools needed to gather resources.",
  "Buy larger trucks like the M923A1 Transport Truck for 50+ ore capacity.",
  "Reach Level 7 Smelting to unlock faster furnace processing — huge time saver.",
  "Pick a profession like Police to earn money, and server reputation.",
  "Always stay in-character. OOC chat is restricted and can ruin immersion.",
  "Never Combat Log (CL). It's a serious offense — always RP through situations.",
  "Use lockers in major towns for secure 200-slot storage. One-time $1M fee.",
  "Helis are expensive and require rare HQ parts. Plan long-term before investing.",
  "Check ammo compatibility using A-List Hub or weapon guides before crafting mags.",
  "Trust no one outside safe zones. Lock your doors — even when smelting.",
  "Follow the New Life Rule (NLR): stay away from your death location for a while.",
  "Track item demand in your phone — timing the market can double your income."
]

export function TipSection() {
  const [currentTip, setCurrentTip] = useState('')

  useEffect(() => {
    setCurrentTip(tips[Math.floor(Math.random() * tips.length)])
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16"
    >
      <div className="bg-background-secondary/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-primary-500 mb-3">💡 Pro Tip</h3>
        <p className="text-white/90">{currentTip}</p>
      </div>
    </motion.section>
  )
}