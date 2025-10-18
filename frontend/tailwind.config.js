/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0B1220',
        panel: '#111827',
        'panel-hover': '#1F2937',
        text: '#E5E7EB',
        'text-dim': '#9CA3AF',
        border: '#374151',
        info: '#38BDF8',
        warn: '#F59E0B',
        critical: '#EF4444',
        ok: '#10B981',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
