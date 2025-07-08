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
        {/* Discord Community CTA - Positioned at top */}
        <div className="bg-background-secondary/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-12">
          <h3 className="text-xl font-semibold text-primary-500 mb-3">Join Our Community</h3>
          <p className="text-white/80 mb-6">
            Connect with fellow ELAN Life players, get support, and help shape the future of A-List tools.
          </p>
          
          <a
            href="https://discord.gg/9HaxJmPSpH"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center py-4 px-8 rounded-xl font-medium text-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden"
          >
            {/* Glass overlay */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/10 to-white/20"></div>
            
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Content */}
            <span className="relative z-10 flex items-center justify-center gap-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 512 388.049" 
                fill="currentColor"
                className="flex-shrink-0"
              >
                <path fillRule="nonzero" d="M433.713 32.491A424.231 424.231 0 00328.061.005c-4.953 8.873-9.488 18.156-13.492 27.509a393.937 393.937 0 00-58.629-4.408c-19.594 0-39.284 1.489-58.637 4.37-3.952-9.33-8.543-18.581-13.525-27.476-36.435 6.212-72.045 17.196-105.676 32.555-66.867 98.92-84.988 195.368-75.928 290.446a425.967 425.967 0 00129.563 65.03c10.447-14.103 19.806-29.116 27.752-44.74a273.827 273.827 0 01-43.716-20.862c3.665-2.658 7.249-5.396 10.712-8.055 40.496 19.019 84.745 28.94 129.514 28.94 44.77 0 89.019-9.921 129.517-28.943 3.504 2.86 7.088 5.598 10.712 8.055a275.576 275.576 0 01-43.796 20.918 311.49 311.49 0 0027.752 44.705 424.235 424.235 0 00129.65-65.019l-.011.011c10.632-110.26-18.162-205.822-76.11-290.55zM170.948 264.529c-25.249 0-46.11-22.914-46.11-51.104 0-28.189 20.135-51.304 46.029-51.304 25.895 0 46.592 23.115 46.15 51.304-.443 28.19-20.336 51.104-46.069 51.104zm170.102 0c-25.29 0-46.069-22.914-46.069-51.104 0-28.189 20.135-51.304 46.069-51.304s46.472 23.115 46.029 51.304c-.443 28.19-20.296 51.104-46.029 51.104z"/>
              </svg>
              <span className="font-semibold tracking-wide">Join Our Discord</span>
            </span>
          </a>
          
          <p className="text-white/50 text-sm mt-4">
            Click to join now and become part of the A-List friends & family
          </p>
        </div>

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