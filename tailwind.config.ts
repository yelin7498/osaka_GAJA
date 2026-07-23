import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        washi: '#F6F1E5',
        card: '#FFFCF5',
        ink: '#232B25',
        inksoft: '#5B6459',
        indigo: '#2C4770',
        indigosoft: '#7488A6',
        vermillion: '#C1442D',
        vermillionsoft: '#E3B5AA',
        gold: '#B8862D',
        line: '#DDD3BC',
        linesoft: '#EAE2CE',
      },
      fontFamily: {
        display: ['"Song Myung"', 'serif'],
        sans: ['"Noto Sans KR"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
