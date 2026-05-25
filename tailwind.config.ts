import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A7F64',
          light: '#25A882',
          surface: '#E8F5F1',
          dark: '#085041',
        },
        amber: {
          DEFAULT: '#F5A623',
          surface: '#FEF3D8',
          dark: '#854F0B',
        },
        danger: {
          DEFAULT: '#E53E3E',
          surface: '#FCEBEB',
          dark: '#A32D2D',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          600: '#dc2626',
          700: '#b91c1c',
        },
        ink: '#1A1A2E',
        surface: '#F8FAFB',
        card: '#FFFFFF',
        border: '#E2E8F0',
        dark: {
          bg: '#0D1F1A',
          card: '#152920',
          border: '#1E3D30',
        },
        'gray-500': '#6B7280',
        'gray-300': '#9CA3AF',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-source-code-pro)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;