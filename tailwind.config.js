/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        // Accent colors for canvas elements
        accent: {
          green: '#10b981',
          'green-light': '#d1fae5',
          red: '#ef4444',
          'red-light': '#fee2e2',
          yellow: '#f59e0b',
          'yellow-light': '#fef3c7',
          blue: '#3b82f6',
          'blue-light': '#dbeafe',
          purple: '#8b5cf6',
          'purple-light': '#f3e8ff',
          pink: '#ec4899',
          'pink-light': '#fce7f3',
          teal: '#14b8a6',
          'teal-light': '#ccfbf1',
          indigo: '#6366f1',
          'indigo-light': '#e0e7ff',
          orange: '#f97316',
          'orange-light': '#ffedd5',
          coral: '#f43f5e',
          'coral-light': '#fff1f2',
          cyan: '#06b6d4',
          'cyan-light': '#cffafe',
        },
        // Canvas-specific colors
        canvas: {
          bg: '#f8fafc',
          grid: '#e2e8f0',
          border: '#cbd5e1',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'premium-sm': '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'premium-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        'premium-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        'premium-xl': '0 20px 40px -10px rgba(0, 0, 0, 0.12), 0 10px 20px -5px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.15), 0 0 40px rgba(99, 102, 241, 0.1)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.15), 0 0 40px rgba(139, 92, 246, 0.1)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.15), 0 0 40px rgba(236, 72, 153, 0.1)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.1)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(59, 130, 246, 0.1)',
        'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        'sticky': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'draw': 'draw 1s ease-out forwards',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-scale': 'fade-scale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'dash-flow': 'dash-flow 1s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        draw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-scale': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'dash-flow': {
          'to': { strokeDashoffset: '-12' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        'gradient-sunrise': 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #e0e7ff 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #cffafe 0%, #dbeafe 50%, #e0e7ff 100%)',
        'gradient-forest': 'linear-gradient(135deg, #d1fae5 0%, #ccfbf1 50%, #cffafe 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #ffedd5 0%, #fee2e2 50%, #fce7f3 100%)',
        'dots-pattern': 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}
