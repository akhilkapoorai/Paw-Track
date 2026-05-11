import { Link } from "wouter";
import { PawPrint, Plus, Eye, MapPin, Calendar, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useListPets } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMe } from "@workspace/api-client-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: me } = useGetMe({ query: { enabled: !!user } });

  const { data, isLoading } = useListPets(
    { limit: 50 },
    { query: { enabled: !!me } }
  );

  const myPets = (data?.pets ?? []).filter((p) => p.owner?.id === me?.id);

  const stats = {
    total: myPets.length,
    lost: myPets.filter((p) => p.status === "LOST").length,
    found: myPets.filter((p) => p.status === "FOUND").length,
    reunited: myPets.filter((p) => p.status === "REUNITED").length,
    sightings: myPets.reduce((acc, p) => acc + (p.sightingCount ?? 0), 0),
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <PawPrint className="h-12 w-12 mx-auto text-orange-300 mb-3" />
          <h2 className="text-xl font-semibold text-gray-700">Sign in to view your dashboard</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} className="h-12 w-12 rounded-full object-cover ring-2 ring-orange-200" alt="" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
                  {user.displayName?.[0] ?? "U"}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.displayName ?? "My Dashboard"}</h1>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <Link href="/report">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
                <Plus className="h-4 w-4" />
                Report Lost Pet
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Reports", value: stats.total, color: "text-gray-700" },
            { label: "Still Lost", value: stats.lost, color: "text-red-600" },
            { label: "Found", value: stats.found, color: "text-yellow-600" },
            { label: "Reunited 🎉", value: stats.reunited, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {stats.sightings > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-3">
            <Eye className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700">
              Your pets have received <strong>{stats.sightings}</strong> community sighting{stats.sightings !== 1 ? "s" : ""}! Check each pet for details.
            </p>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">My Reports</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 flex gap-4 shadow-sm">
                  <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : myPets.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <PawPrint className="h-10 w-10 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No reports yet</p>
              <p className="text-sm text-gray-400 mt-1">Report a lost pet to get started</p>
              <Link href="/report">
                <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create your first report
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myPets.map((pet) => (
                <Link key={pet.id} href={`/pet/${pet.id}`}>
                  <div className="bg-white rounded-xl p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <img
                      src={pet.photoUrl}
                      alt={pet.name}
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://placedog.net/100/100?id=${pet.id}`; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{pet.name}</p>
                        <StatusBadge status={pet.status as "LOST" | "FOUND" | "REUNITED"} />
                        {(pet.sightingCount ?? 0) > 0 && (
                          <span className="text-xs text-blue-600 flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            {pet.sightingCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 capitalize">
                        {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {pet.lastSeenAddress}
                        </span>
                        {pet.updatedAt && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(pet.updatedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 self-center shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
