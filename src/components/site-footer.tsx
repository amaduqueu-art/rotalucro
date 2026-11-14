import { BRAND } from '@/lib/brand';

export function SiteFooter() {
  return (
    <footer className="mb-14 border-t border-border bg-card py-6 text-center text-xs text-muted-foreground md:mb-0">
      <p>
        <strong className="text-foreground">{BRAND.name}</strong> · por{' '}
        {BRAND.owner} · {BRAND.tagline}
      </p>
      <p className="mt-1">
        Seus dados ficam protegidos na sua conta (Row Level Security).
      </p>
    </footer>
  );
}
