import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { LocaleHtml } from '@/components/locale-html';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MrBar — Business Panel',
  description: 'Promotions, raffles and notifications platform for venues',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className={inter.className}>
        <Providers>
          <LocaleHtml />
          {children}
        </Providers>
      </body>
    </html>
  );
}
