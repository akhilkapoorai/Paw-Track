import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Eye, User2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface PetCardProps {
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string | null;
    color: string;
    photoUrl: string;
    status: "LOST" | "FOUND" | "REUNITED";
    lastSeenAddress: string;
    lastSeenAt?: string | null;
    sightingCount?: number;
    owner?: { displayName: string; photoUrl?: string | null } | null;
    distanceMiles?: number;
  };
}

export function PetCard({ pet }: PetCardProps) {
  return (
    <Link href={`/pet/${pet.id}`}>
      <div
        className="overflow-hidden cursor-pointer bg-white border border-slate-200 transition-all duration-200"
        style={{
          borderRadius: "16px",
          boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(15,23,42,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(15,23,42,0.06)";
        }}
      >
        <div className="relative">
          <img
            src={pet.photoUrl}
            alt={pet.name}
            className="w-full h-52 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placedog.net/400/300?id=${pet.id}`;
            }}
          />
          <div className="absolute top-2 left-2">
            <StatusBadge status={pet.status} />
          </div>
          {pet.species && (
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs rounded-full px-2 py-0.5 capitalize">
              {pet.species}
            </div>
          )}
          {pet.distanceMiles !== undefined && (
            <div
              className="absolute bottom-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "#EEF2FF", color: "#4F46E5" }}
            >
              {pet.distanceMiles < 0.1 ? "< 0.1 mi" : `${pet.distanceMiles.toFixed(1)} mi`}
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <div>
            <h3 className="font-semibold text-lg leading-tight" style={{ color: "#0F172A" }}>{pet.name}</h3>
            {pet.breed && (
              <p className="text-sm" style={{ color: "#475569" }}>{pet.breed} · {pet.color}</p>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
            <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "#94A3B8" }} />
            <span className="truncate">{pet.lastSeenAddress}</span>
          </div>

          {pet.lastSeenAt && (
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              {formatDistanceToNow(new Date(pet.lastSeenAt), { addSuffix: true })}
            </p>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            {pet.owner && (
              <div className="flex items-center gap-1.5">
                {pet.owner.photoUrl ? (
                  <img src={pet.owner.photoUrl} className="h-5 w-5 rounded-full object-cover" alt="" />
                ) : (
                  <User2 className="h-4 w-4" style={{ color: "#94A3B8" }} />
                )}
                <span className="text-xs truncate max-w-[120px]" style={{ color: "#475569" }}>{pet.owner.displayName}</span>
              </div>
            )}
            {(pet.sightingCount ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs ml-auto" style={{ color: "#4F46E5" }}>
                <Eye className="h-3.5 w-3.5" />
                <span>{pet.sightingCount} sighting{pet.sightingCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
