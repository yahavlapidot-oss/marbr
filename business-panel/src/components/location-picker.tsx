'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom amber pin matching app theme
const pinIcon = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#f59e0b;border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(245,158,11,0.6)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  className: '',
});

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });
  useEffect(() => {
    const prev = prevRef.current;
    // Only recenter when lat/lng change significantly (user typed a new value)
    if (Math.abs(prev.lat - lat) > 0.001 || Math.abs(prev.lng - lng) > 0.001) {
      map.setView([lat, lng], map.getZoom());
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);
  return null;
}

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const center: [number, number] = [lat || 32.0853, lng || 34.7818];

  return (
    <div className="rounded-xl overflow-hidden border border-[#2a2a38]" style={{ height: 280 }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%', background: '#0f0f13' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        <ClickHandler onClick={onChange} />
        <RecenterMap lat={lat || 32.0853} lng={lng || 34.7818} />
        {lat && lng && (
          <Marker position={[lat, lng]} icon={pinIcon} draggable eventHandlers={{
            dragend(e) {
              const m = e.target as L.Marker;
              const pos = m.getLatLng();
              onChange(pos.lat, pos.lng);
            },
          }} />
        )}
        {/* Attribution */}
        <div
          style={{
            position: 'absolute', bottom: 6, right: 8, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', borderRadius: 4,
            padding: '2px 6px', fontSize: 9, color: 'rgba(255,255,255,0.5)',
          }}
        >
          © CartoDB © OpenStreetMap
        </div>
      </MapContainer>
    </div>
  );
}
