import Link from 'next/link';
import { CarTaxiFront } from 'lucide-react';

import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { BRAND } from '@/lib/brand';

export function SiteHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-raised">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link
          href="/"
          className="flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${BRAND.name} — início`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent">
            <CarTaxiFront className="size-5" aria-hidden="true" />
          </span>
          <span className="truncate text-base font-extrabold tracking-tight sm:text-lg">
            {BRAND.shortName}
            <span className="text-accent-bright">ComLucro</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <span
            className="hidden max-w-[180px] truncate text-sm text-primary-foreground/80 lg:inline"
            title={email}
          >
            {email}
          </span>
          <ThemeToggle className="text-primary-foreground hover:bg-white/10" />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
