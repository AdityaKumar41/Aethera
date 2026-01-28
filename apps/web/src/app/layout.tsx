import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthSync } from '@/components/auth/auth-sync';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Solar - Renewable Energy Financing Platform',
  description: 'DePIN-powered financing platform connecting solar developers with investors through tokenized renewable energy assets on the Stellar blockchain.',
  keywords: ['renewable energy', 'solar', 'DePIN', 'blockchain', 'Stellar', 'tokenization', 'investment'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>
          <AuthSync />
          <div className="min-h-screen bg-background">
            {children}
          </div>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
