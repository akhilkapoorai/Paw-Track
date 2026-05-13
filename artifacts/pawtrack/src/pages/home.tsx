import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Search, SlidersHorizontal, MapPin, X, ChevronDown, Loader2, Bell } from "lucide-react";
import { useListPets } from "@workspace/api-client-react";
import { PetCard } from "@/components/PetCard";
import { AlertSubscribeModal } from "@/components/AlertSubscribeModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SPECIES = ["all", "dog", "cat", "bird", "rabbit", "other"];
const STATUSES = [
  { value: "all", label: "All" },
  { value: "LOST", label: "Lost" },
  { value: "FOUND", label: "Found" },
  { value: "REUNITED", label: "Reunited" },
];

interface LocationState {
  lat: number;
  lng: number;
  name: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useStats() {
  const [stats, setStats] = useState<{ totalPets: number; totalSightings: number } | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d as { totalPets: number; totalSightings: number }))
      .catch(() => {});
  }, []);
  return stats;
}

function ChangeLocationModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (loc: LocationState) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
          { headers: { "User-Agent": "PawTrack/1.0" } },
        );
        const data = await res.json() as NominatimResult[];
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query]);

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "User-Agent": "PawTrack/1.0" } },
      );
      const data = await res.json() as { address?: { city?: string; town?: string; state?: string; postcode?: string } };
      const city = data.address?.city ?? data.address?.town ?? "My Location";
      const state = data.address?.state ?? "";
      const postcode = data.address?.postcode ?? "";
      const name = `${city}${state ? `, ${state}` : ""}${postcode ? ` ${postcode}` : ""}`;
      onSelect({ lat: latitude, lng: longitude, name });
      onClose();
    } catch {
      alert("Could not get your location. Please type an address.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: "#0F172A" }}>Change Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94A3B8" }} />
            <Input
              className="pl-9"
              placeholder="Search city, address, or postcode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
            />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 font-semibold"
            style={{ color: "#4F46E5", border: "1.5px solid #4F46E5", background: "#EEF2FF" }}
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Use my current location
          </Button>

          {searching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#4F46E5" }} />
            </div>
          )}

          {results.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {results.map((r, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name.split(",").slice(0, 3).join(", ") });
                    onClose();
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#4F46E5" }} />
                    <span className="text-sm" style={{ color: "#0F172A" }}>{r.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const [species, setSpecies] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertsBannerDismissed, setAlertsBannerDismissed] = useState(false);
  const stats = useStats();

  useEffect(() => {
    if (!navigator.geolocation) { setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "PawTrack/1.0" } },
          );
          const data = await res.json() as { address?: { city?: string; town?: string; state?: string; postcode?: string } };
          const city = data.address?.city ?? data.address?.town ?? "Your area";
          const state = data.address?.state ?? "";
          const postcode = data.address?.postcode ?? "";
          const name = `${city}${state ? `, ${state}` : ""}${postcode ? ` ${postcode}` : ""}`;
          setLocation({ lat: latitude, lng: longitude, name });
        } catch {
          setLocation({ lat: latitude, lng: longitude, name: "Your area" });
        } finally {
          setLocationLoading(false);
        }
      },
      () => setLocationLoading(false),
      { timeout: 6000 },
    );
  }, []);

  const { data, isLoading } = useListPets({
    species: species === "all" ? undefined : species,
    status: status === "all" ? undefined : (status as "LOST" | "FOUND" | "REUNITED"),
    limit: 50,
  });

  const pets = data?.pets ?? [];

  const filtered = (() => {
    let list = pets;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.breed?.toLowerCase().includes(q) ||
          p.lastSeenAddress?.toLowerCase().includes(q),
      );
    }

    if (location) {
      const withDist = list.map((p) => ({
        ...p,
        distanceMiles: haversine(location.lat, location.lng, Number(p.lastSeenLat), Number(p.lastSeenLng)),
      }));
      let nearby = withDist.filter((p) => p.distanceMiles <= 50).sort((a, b) => a.distanceMiles - b.distanceMiles);
      if (nearby.length < 3) {
        nearby = withDist.filter((p) => p.distanceMiles <= 150).sort((a, b) => a.distanceMiles - b.distanceMiles);
      }
      return nearby;
    }

    return list;
  })();

  const expandedRadius = location && filtered.length > 0 && filtered.some((p) => (p as typeof filtered[0] & { distanceMiles?: number }).distanceMiles !== undefined && ((p as typeof filtered[0] & { distanceMiles?: number }).distanceMiles ?? 0) > 50);

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <h1
            className="font-extrabold leading-tight mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "white" }}
          >
            Every Second Counts.<br />
            Help Bring Them{" "}
            <span style={{ color: "#F59E0B" }}>Home.</span>
          </h1>
          <p
            className="mx-auto mb-8"
            style={{ color: "#CBD5E1", maxWidth: "560px", lineHeight: 1.65, fontSize: "1.0625rem" }}
          >
            Lost pets find their way home faster when a community looks together.
            Browse local reports, drop a pin where you spotted a pet, and let AI
            map where they might be heading next.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Link href="/report">
              <Button
                className="font-bold px-6"
                style={{ background: "#F59E0B", color: "#0F172A", borderRadius: "10px" }}
              >
                Report a Lost Pet →
              </Button>
            </Link>
            <a href="#feed">
              <Button
                variant="outline"
                className="font-bold px-6"
                style={{ borderRadius: "10px", borderColor: "rgba(255,255,255,0.4)", color: "white", background: "transparent" }}
              >
                Browse Lost Pets ↓
              </Button>
            </a>
          </div>

          {stats && (
            <p style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
              🐾 {stats.totalPets} pets reported · {stats.totalSightings} sightings submitted
            </p>
          )}

          {/* Search */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94A3B8" }} />
            <Input
              className="pl-9 rounded-full shadow-sm text-slate-800"
              placeholder="Search by name, breed, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "white", border: "1.5px solid #E2E8F0" }}
            />
          </div>
        </div>
      </div>

      <div id="feed" className="max-w-6xl mx-auto px-4">
        {/* Alerts banner */}
        {!alertsBannerDismissed && (
          <div
            className="mt-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
            style={{ background: "#EEF2FF", borderLeft: "4px solid #4F46E5" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="h-4 w-4 shrink-0" style={{ color: "#4F46E5" }} />
              <p className="text-sm font-semibold truncate" style={{ color: "#0F172A" }}>
                Get notified when pets go missing near you.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="text-sm font-bold whitespace-nowrap"
                style={{ color: "#4F46E5" }}
                onClick={() => setShowAlertModal(true)}
              >
                Set Up Free Alerts →
              </button>
              <button onClick={() => setAlertsBannerDismissed(true)}>
                <X className="h-4 w-4" style={{ color: "#94A3B8" }} />
              </button>
            </div>
          </div>
        )}

        {/* Location bar */}
        <div className="mt-4 mb-3">
          {locationLoading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : location ? (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
                style={{ background: "#EEF2FF", color: "#4F46E5" }}
              >
                <MapPin className="h-3.5 w-3.5" />
                {location.name}
              </span>
              <button
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: "#475569" }}
                onClick={() => setShowLocationModal(true)}
              >
                Change Location <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <p className="text-sm ml-auto" style={{ color: "#94A3B8" }}>
                Showing {filtered.length} lost pet{filtered.length !== 1 ? "s" : ""} near you
                {expandedRadius && " (expanded to 150 mi)"}
              </p>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{ background: "#EEF2FF", color: "#4F46E5" }}
              onClick={() => setShowLocationModal(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              Set location to see nearby pets
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1 bg-white rounded-full px-2 py-1 border border-slate-200"
              style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 ml-1" style={{ color: "#94A3B8" }} />
              {STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className="px-3 py-1 rounded-full text-sm transition-colors font-medium"
                  style={status === value
                    ? { background: "#4F46E5", color: "white" }
                    : { color: "#475569" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              className="flex items-center gap-1 bg-white rounded-full px-2 py-1 border border-slate-200"
              style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
            >
              {SPECIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpecies(s)}
                  className="px-3 py-1 rounded-full text-sm capitalize transition-colors font-medium"
                  style={species === s
                    ? { background: "#4F46E5", color: "white" }
                    : { color: "#475569" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>

            {!location && data?.total !== undefined && (
              <span className="text-sm ml-auto" style={{ color: "#94A3B8" }}>
                {data.total} pet{data.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pet grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm">
                <Skeleton className="h-52 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🐾</p>
            <p className="text-lg font-semibold" style={{ color: "#475569" }}>No pets found</p>
            <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>Try adjusting your filters or expanding your location radius</p>
            {location && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation(null)}
                style={{ color: "#4F46E5", borderColor: "#4F46E5" }}
              >
                Show all pets
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((pet) => (
              <PetCard
                key={pet.id}
                pet={{
                  id: pet.id,
                  name: pet.name,
                  species: pet.species,
                  breed: pet.breed,
                  color: pet.color,
                  photoUrl: pet.photoUrl,
                  status: pet.status as "LOST" | "FOUND" | "REUNITED",
                  lastSeenAddress: pet.lastSeenAddress,
                  lastSeenAt: pet.lastSeenAt,
                  sightingCount: pet.sightingCount,
                  owner: pet.owner ? { displayName: pet.owner.displayName, photoUrl: pet.owner.photoUrl } : null,
                  distanceMiles: (pet as typeof pet & { distanceMiles?: number }).distanceMiles,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ChangeLocationModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelect={(loc) => setLocation(loc)}
      />

      <AlertSubscribeModal
        open={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        locationName={location?.name}
        lat={location?.lat}
        lng={location?.lng}
      />
    </div>
  );
}
