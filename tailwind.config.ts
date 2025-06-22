import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#00c6ff',
          600: '#0072ff',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        background: {
          primary: '#121212',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' },
          '100%': { textShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.3)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.dark-dropdown': {
          'background-color': '#2a2a2a !important',
          'border': '1px solid rgba(255, 255, 255, 0.2) !important',
          'color': 'white !important',
          'border-radius': '8px',
          'padding': '12px',
          'font-size': '14px',
          'appearance': 'none',
          '-webkit-appearance': 'none',
          '-moz-appearance': 'none',
          'background-image': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          'background-position': 'right 12px center',
          'background-repeat': 'no-repeat',
          'background-size': '16px',
          'padding-right': '40px',
          'transition': 'border-color 0.2s ease',
          '&:hover': {
            'border-color': 'rgba(255, 255, 255, 0.3) !important',
          },
          '&:focus': {
            'outline': 'none !important',
            'border-color': '#00c6ff !important',
          },
        },
        '.dark-dropdown option': {
          'background-color': '#2a2a2a !important',
          'color': 'white !important',
          'border': 'none !important',
          'padding': '8px 12px !important',
        }
      }
      addUtilities(newUtilities)
    }
  ],
}
export default config