/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand colors - Navy Blue
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        // Navy accent colors
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a192f',
        },
        // Accent colors for canvas elements
        accent: {
          green: '#10b981',
          'green-light': '#d1fae5',
          red: '#ef4444',
          'red-light': '#fee2e2',
          yellow: '#f59e0b',
          'yellow-light': '#fef3c7',
          blue: '#334e68', // Navy blue
          'blue-light': '#d9e2ec',
          purple: '#486581', // Navy shade
          'purple-light': '#f0f4f8',
          pink: '#627d98',
          'pink-light': '#f0f4f8',
          teal: '#243b53',
          'teal-light': '#d9e2ec',
          indigo: '#102a43', // Deep navy
          'indigo-light': '#f0f4f8',
          orange: '#f97316',
          'orange-light': '#ffedd5',
          coral: '#f43f5e',
          'coral-light': '#fff1f2',
          cyan: '#486581',
          'cyan-light': '#f0f4f8',
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
        'glow-indigo': '0 0 20px rgba(16, 42, 67, 0.15), 0 0 40px rgba(16, 42, 67, 0.1)',
        'glow-purple': '0 0 20px rgba(36, 59, 83, 0.15), 0 0 40px rgba(36, 59, 83, 0.1)',
        'glow-pink': '0 0 20px rgba(72, 101, 129, 0.15), 0 0 40px rgba(72, 101, 129, 0.1)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.1)',
        'glow-blue': '0 0 20px rgba(51, 78, 104, 0.15), 0 0 40px rgba(51, 78, 104, 0.1)',
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
          '0%': { boxShadow: '0 0 5px rgba(16, 42, 67, 0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(16, 42, 67, 0.8), 0 0 40px rgba(16, 42, 67, 0.4)' },
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
        'gradient-premium': 'linear-gradient(135deg, #334e68 0%, #486581 50%, #627d98 100%)',
        'gradient-sunrise': 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 50%, #bcccdc 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 50%, #bcccdc 100%)',
        'gradient-forest': 'linear-gradient(135deg, #d1fae5 0%, #ccfbf1 50%, #cffafe 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #ffedd5 0%, #fee2e2 50%, #fce7f3 100%)',
        'dots-pattern': 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}
