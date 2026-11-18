'use client';

import dynamic from 'next/dynamic';

import type { RoutePoint } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

/** Leaflet acessa `window`; por isso o mapa é carregado apenas no cliente. */
const RouteMap = dynamic(() => import('@/components/route-map'), {
  ssr: false,
  loading: () => (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl border bg-secondary/40 text-xs text-muted-foreground',
      )}
      style={{ height: 220 }}
    >
      Carregando mapa...
    </div>
  ),
});

interface RouteMapPanelProps {
  points: RoutePoint[];
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export function RouteMapPanel({
  points,
  height,
  onMapClick,
  className,
}: RouteMapPanelProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-secondary/30', className)}>
      <RouteMap points={points} height={height} onMapClick={onMapClick} />
    </div>
  );
}
