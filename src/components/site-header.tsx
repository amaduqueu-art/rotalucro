import Link from 'next/link';
import { CarTaxiFront } from 'lucide-react';

import { LogoutButton } from '@/components/logout-button';

export function SiteHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-raised">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent">
            <CarTaxiFront className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            RotaLucro
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span
            className="hidden max-w-[200px] truncate text-sm text-primary-foreground/80 sm:inline"
            title={email}
          >
            {email}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
