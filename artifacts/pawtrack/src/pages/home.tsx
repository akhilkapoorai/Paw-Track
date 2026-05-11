import { useState } from "react";
import { Search, SlidersHorizontal, PawPrint } from "lucide-react";
import { useListPets } from "@workspace/api-client-react";
import { PetCard } from "@/components/PetCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SPECIES = ["all", "dog", "cat", "bird", "rabbit", "other"];
const STATUSES = [
  { value: "all", label: "All" },
  { value: "LOST", label: "Lost" },
  { value: "FOUND", label: "Found" },
  { value: "REUNITED", label: "Reunited" },
];

export default function Home() {
  const [species, setSpecies] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListPets({
    species: species === "all" ? undefined : species,
    status: status === "all" ? undefined : (status as "LOST" | "FOUND" | "REUNITED"),
    limit: 24,
  });

  const pets = data?.pets ?? [];
  const filtered = search.trim()
    ? pets.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.breed?.toLowerCase().includes(search.toLowerCase()) ||
        p.lastSeenAddress?.toLowerCase().includes(search.toLowerCase()),
      )
    : pets;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <PawPrint className="h-7 w-7 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">Help bring pets home</h1>
          </div>
          <p className="text-gray-500 max-w-lg mx-auto">
            Browse lost and found pets in your area. Every sighting helps.
          </p>

          <div className="mt-5 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 bg-white border-gray-200 rounded-full shadow-sm"
              placeholder="Search by name, breed, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 border border-gray-200 shadow-sm">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400 ml-1" />
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  status === value
                    ? "bg-orange-500 text-white font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 border border-gray-200 shadow-sm">
            {SPECIES.map((s) => (
              <button
                key={s}
                onClick={() => setSpecies(s)}
                className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                  species === s
                    ? "bg-orange-500 text-white font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {data?.total !== undefined && (
            <span className="text-sm text-gray-400 ml-auto">{data.total} pet{data.total !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm">
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
            <PawPrint className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-500">No pets found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
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
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
