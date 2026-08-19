import './globals.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'German with Boka',
  description: 'MVP aplikacija za zakazivanje individualnih online casova nemackog jezika.'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return children;
}
