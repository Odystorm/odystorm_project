import type { Metadata, Viewport } from 'next';
import { Orbitron, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { PlayerProvider } from '@/context/PlayerContext';
import { AppShell } from '@/components/shell/AppShell';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'OdyStorm Space Defense — Command Deck & Arcade',
    template: '%s | OdyStorm Space Defense',
  },
  description:
    'Command your orbital $ODY mining reactor, upgrade 15 tiers of starship weaponry and shields, and defend the galaxy in 60fps browser arcade sorties.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#070b14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <PlayerProvider>
          <AppShell>{children}</AppShell>
        </PlayerProvider>
      </body>
    </html>
  );
}
