import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // "Borders of Nature & Tech" palette
        forest: {
          DEFAULT: '#14201A',
          50: '#2A3F32',
          100: '#213830',
          200: '#1A2E23',
          300: '#14201A',
          400: '#0E1612',
          500: '#080C0A',
        },
        mist: {
          DEFAULT: '#E2E8F0',
          dim: '#94A3B8',
          muted: '#64748B',
        },
        orchid: {
          DEFAULT: '#A855F7',
          light: '#C084FC',
          dark: '#7C3AED',
          glow: 'rgba(168, 85, 247, 0.15)',
          subtle: 'rgba(168, 85, 247, 0.06)',
        },
        teal: {
          DEFAULT: '#0D9488',
          light: '#14B8A6',
          glow: 'rgba(13, 148, 136, 0.15)',
        },
        amber: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          glow: 'rgba(245, 158, 11, 0.15)',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FCA5A5',
          glow: 'rgba(239, 68, 68, 0.15)',
        },
        safe: {
          DEFAULT: '#22C55E',
          light: '#86EFAC',
          glow: 'rgba(34, 197, 94, 0.15)',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#93C5FD',
          glow: 'rgba(59, 130, 246, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        glass: '12px',
        heavy: '20px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.2)',
        'ai-glow': '0 0 30px rgba(168, 85, 247, 0.15)',
        'teal-glow': '0 0 20px rgba(13, 148, 136, 0.2)',
        'danger-glow': '0 0 20px rgba(239, 68, 68, 0.2)',
      },
      borderRadius: {
        glass: '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
        'route-draw': 'routeDraw 2s ease-in-out forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'count-up': 'countUp 1s ease-out',
        'marker-pulse': 'markerPulse 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        routeDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        markerPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
