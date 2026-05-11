import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface Location {
  lat: number;
  lng: number;
  label?: string;
  type?: "origin" | "sighting" | "ai";
  seenAt?: string;
  address?: string;
}

interface PetMapProps {
  lastSeenLat: number;
  lastSeenLng: number;
  sightings?: Array<{ lat: number; lng: number; address: string; seenAt: string; isFlagged: boolean; sequence: number }>;
  aiPath?: Array<{ lat: number; lng: number; confidence: string; reasoning: string }>;
  aiApproved?: boolean;
  className?: string;
}

const orangeIcon = L.divIcon({
  html: `<div style="background:#f97316;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconAnchor: [7, 7],
});

const redIcon = L.divIcon({
  html: `<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);animation:pulse 2s infinite"></div>`,
  className: "",
  iconAnchor: [9, 9],
});

const blueIcon = L.divIcon({
  html: `<div style="background:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;opacity:0.7;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconAnchor: [6, 6],
});

export function PetMap({ lastSeenLat, lastSeenLng, sightings = [], aiPath = [], aiApproved = false, className = "" }: PetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lastSeenLat, lastSeenLng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    L.marker([lastSeenLat, lastSeenLng], { icon: redIcon })
      .addTo(map)
      .bindPopup("<strong>Last known location</strong>")
      .openPopup();

    const activeSightings = sightings.filter((s) => !s.isFlagged).sort((a, b) => a.sequence - b.sequence);

    activeSightings.forEach((s) => {
      L.marker([s.lat, s.lng], { icon: orangeIcon })
        .addTo(map)
        .bindPopup(`<strong>Sighting #${s.sequence}</strong><br/>${s.address}<br/><em>${new Date(s.seenAt).toLocaleDateString()}</em>`);
    });

    if (activeSightings.length > 0) {
      const verifiedPoints: [number, number][] = [
        [lastSeenLat, lastSeenLng],
        ...activeSightings.map((s): [number, number] => [s.lat, s.lng]),
      ];
      L.polyline(verifiedPoints, { color: "#f97316", weight: 3, opacity: 0.8, dashArray: "6,4" }).addTo(map);
    }

    if (aiPath.length > 0 && aiApproved) {
      const lastVerified = activeSightings[activeSightings.length - 1];
      const startPt: [number, number] = lastVerified
        ? [lastVerified.lat, lastVerified.lng]
        : [lastSeenLat, lastSeenLng];

      const aiPoints: [number, number][] = [startPt, ...aiPath.map((p): [number, number] => [p.lat, p.lng])];
      L.polyline(aiPoints, { color: "#8b5cf6", weight: 3, opacity: 0.6, dashArray: "10,6" }).addTo(map);

      aiPath.forEach((pt, i) => {
        L.marker([pt.lat, pt.lng], { icon: blueIcon })
          .addTo(map)
          .bindPopup(`<strong>AI Prediction ${i + 1}</strong><br/>Confidence: ${pt.confidence}<br/><em>${pt.reasoning}</em>`);
      });
    }

    const allPoints: [number, number][] = [
      [lastSeenLat, lastSeenLng],
      ...activeSightings.map((s): [number, number] => [s.lat, s.lng]),
    ];
    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints).pad(0.2));
    }
  }, [lastSeenLat, lastSeenLng, sightings, aiPath, aiApproved]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
      <div className="absolute bottom-2 left-2 bg-white/90 rounded-lg px-3 py-2 text-xs space-y-1 shadow z-[1000]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
          <span>Last known location</span>
        </div>
        {sightings.filter((s) => !s.isFlagged).length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
            <span>Verified sightings</span>
          </div>
        )}
        {aiPath.length > 0 && aiApproved && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500 inline-block" />
            <span>AI predicted path</span>
          </div>
        )}
      </div>
    </div>
  );
}
