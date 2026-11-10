import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Select nativo (melhor experiência no teclado dos celulares) com a
 * aparência dos outros campos: 16 px de fonte e altura de 44 px.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-11 w-full appearance-none rounded-lg border border-input bg-white px-3 py-2 pr-9 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };
