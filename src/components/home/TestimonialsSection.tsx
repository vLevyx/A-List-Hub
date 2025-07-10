'use client'

import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: "The Crafting Calculator saved me hours — can't play without it.",
    author: "Alexa Knox"
  },
  {
    quote: "In all my time on Everon, few match the knowledge and experience The A-List brings.",
    author: "Hamish Macbeth"
  },
  {
    quote: "This hub is better than the official wiki.",
    author: "Clark Kent"
  },
  {
    quote: "Super helpful and easy tools to use, definitely a must-try for everyone!",
    author: "Xena Ramirez"
  }
]

export function TestimonialsSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16"
    >
      <div className="text-center">
        <h3 className="text-2xl font-bold text-primary-500 mb-8">🌟 What Players Say</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
            >
              <p className="text-white/90 italic mb-4">"{testimonial.quote}"</p>
              <p className="text-primary-500 font-semibold">- {testimonial.author}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}