'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';

import type { RoutePoint } from '@/lib/supabase/types';

export interface RouteMapProps {
  points: RoutePoint[];
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

/** Ajusta o enquadramento sempre que a rota muda. */
function FitRoute({ points }: { points: RoutePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }

    if (points.length > 1) {
      const bounds = points.map(
        (point) => [point.lat, point.lng] as [number, number],
      );
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    }
  }, [map, points]);

  return null;
}

/** Clique no mapa para adicionar pontos quando o GPS não estiver disponível. */
function ClickHandler({
  onClick,
}: {
  onClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!onClick) return;

    const handle = (event: L.LeafletMouseEvent) => {
      onClick(event.latlng.lat, event.latlng.lng);
    };

    map.on('click', handle);
    return () => {
      map.off('click', handle);
    };
  }, [map, onClick]);

  return null;
}

export default function RouteMap({
  points,
  height = 220,
  onMapClick,
  className,
}: RouteMapProps) {
  const positions = points.map(
    (point) => [point.lat, point.lng] as [number, number],
  );

  return (
    <div
      className={className}
      style={{ height, width: '100%' }}
      aria-label="Mapa da rota da corrida"
      role="img"
    >
      <MapContainer
        center={positions[0] ?? DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full rounded-xl [&_.leaflet-tile-pane]:dark:brightness-[0.7]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {positions.length > 1 ? (
          <Polyline positions={positions} pathOptions={{ color: '#b64a0c', weight: 4 }} />
        ) : null}

        {positions.length > 0 ? (
          <CircleMarker
            center={positions[0]}
            radius={7}
            pathOptions={{ color: '#ffffff', fillColor: '#15803d', fillOpacity: 1 }}
          />
        ) : null}

        {positions.length > 1 ? (
          <CircleMarker
            center={positions[positions.length - 1]}
            radius={7}
            pathOptions={{ color: '#ffffff', fillColor: '#b91c1c', fillOpacity: 1 }}
          />
        ) : null}

        <FitRoute points={points} />
        <ClickHandler onClick={onMapClick} />
      </MapContainer>
    </div>
  );
}
