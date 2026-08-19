import type {Config} from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        boka: {
          cta: '#FB8D2B',
          bg: '#FFF3E8',
          text: '#111111'
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
