import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Eye, User2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { Card } from "@/components/ui/card";

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
  };
}

export function PetCard({ pet }: PetCardProps) {
  return (
    <Link href={`/pet/${pet.id}`}>
      <Card className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
        <div className="relative">
          <img
            src={pet.photoUrl}
            alt={pet.name}
            className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
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
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">{pet.name}</h3>
              {pet.breed && (
                <p className="text-sm text-gray-500">{pet.breed} · {pet.color}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{pet.lastSeenAddress}</span>
          </div>

          {pet.lastSeenAt && (
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(pet.lastSeenAt), { addSuffix: true })}
            </p>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            {pet.owner && (
              <div className="flex items-center gap-1.5">
                {pet.owner.photoUrl ? (
                  <img src={pet.owner.photoUrl} className="h-5 w-5 rounded-full object-cover" alt="" />
                ) : (
                  <User2 className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-xs text-gray-500 truncate max-w-[120px]">{pet.owner.displayName}</span>
              </div>
            )}
            {(pet.sightingCount ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-600 ml-auto">
                <Eye className="h-3.5 w-3.5" />
                <span>{pet.sightingCount} sighting{pet.sightingCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
