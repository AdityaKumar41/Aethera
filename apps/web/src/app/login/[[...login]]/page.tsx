'use client';

import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { Sun, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Sun className="h-10 w-10 text-solar-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-solar-500 to-stellar-500 bg-clip-text text-transparent">
              Aethera
            </span>
          </div>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-card border border-border shadow-lg',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              socialButtonsBlockButton: 'border-border hover:bg-accent',
              formFieldLabel: 'text-foreground',
              formFieldInput: 'bg-background border-input text-foreground',
              footerActionLink: 'text-solar-500 hover:text-solar-400',
              formButtonPrimary: 'bg-solar-500 hover:bg-solar-600',
            },
          }}
          routing="path"
          path="/login"
          signUpUrl="/register"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
