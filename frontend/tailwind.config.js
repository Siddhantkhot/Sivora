/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        
        primary: {
          light: '#C90B03', // Indigo-500
          DEFAULT: '#4F46E5', // Indigo-600
          dark: '#4338CA', // Indigo-700
        },
        secondary: {
          light: '#F472B6', // Pink-400
          DEFAULT: '#EC4899', // Pink-500
          dark: '#DB2777', // Pink-600
        },
        accent: {
          light: '#34D399', // Emerald-400
          DEFAULT: '#10B981', // Emerald-500
          dark: '#059669', // Emerald-600
        },
        chat: {
          sent: '#E0F2FE', // Sky-100
          received: '#F3E8FF', // Purple-100
          bubble: '#F9FAFB', // Gray-50
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'slideIn': 'slideIn 0.3s ease-out forwards',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'chat-pattern': "url('./bg.jpg')",
        'ui-bg': "url('./bg.jpeg')",
      },
      fontFamily:{
        'comic':'Comic Sans MS, cursive, sans-serif',
      }
    },
  },
  plugins: [],
}
