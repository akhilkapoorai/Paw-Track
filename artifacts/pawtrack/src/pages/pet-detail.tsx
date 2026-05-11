import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, MapPin, Calendar, Eye, Bot, CheckCircle2, XCircle,
  Flag, MessageSquare, Loader2, User2, AlertTriangle, Share2
} from "lucide-react";
import { useGetPet, useUpdatePetStatus, useApproveAiPath, useDenyAiPath, useFlagSighting, useCreatePetUpdate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PetMap } from "@/components/PetMap";
import { SightingForm } from "@/components/SightingForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { joinPetRoom, leavePetRoom, getSocket } from "@/lib/socket";

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [note, setNote] = useState("");

  const { data: pet, isLoading, queryKey } = useGetPet(id!, {
    query: { enabled: !!id },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const updateStatus = useUpdatePetStatus({ mutation: { onSuccess: invalidate } });
  const approveAi = useApproveAiPath({ mutation: { onSuccess: invalidate } });
  const denyAi = useDenyAiPath({ mutation: { onSuccess: invalidate } });
  const flagSighting = useFlagSighting({ mutation: { onSuccess: invalidate } });
  const createUpdate = useCreatePetUpdate({
    mutation: {
      onSuccess: () => {
        setNote("");
        invalidate();
        toast({ title: "Note added" });
      },
    },
  });

  const isOwner = user && pet?.owner && pet.owner.firebaseUid === user.uid;

  useEffect(() => {
    if (!id) return;
    joinPetRoom(id);
    const socket = getSocket();

    socket.on("sighting:new", invalidate);
    socket.on("pet:updated", invalidate);
    socket.on("ai:path-updated", invalidate);
    socket.on("ai:path-approved", invalidate);
    socket.on("ai:path-denied", invalidate);

    return () => {
      leavePetRoom(id);
      socket.off("sighting:new", invalidate);
      socket.off("pet:updated", invalidate);
      socket.off("ai:path-updated", invalidate);
      socket.off("ai:path-approved", invalidate);
      socket.off("ai:path-denied", invalidate);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-10 w-10 text-gray-300" />
        <p className="text-gray-500">Pet not found</p>
        <Link href="/"><Button variant="outline">Back to feed</Button></Link>
      </div>
    );
  }

  const aiCache = pet.aiPathCache as { coordinates?: Array<{lat:number;lng:number;confidence:string;reasoning:string}>; summary?: string; approved?: boolean } | null;
  const aiPath = aiCache?.coordinates ?? [];
  const aiApproved = aiCache?.approved ?? false;
  const activeSightings = (pet.sightings ?? []).filter((s) => !s.isFlagged);

  async function handleShare() {
    try {
      await navigator.share({ title: `Help find ${pet!.name}!`, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="relative">
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placedog.net/400/300?id=${pet.id}`;
                  }}
                />
                <div className="absolute top-3 left-3">
                  <StatusBadge status={pet.status as "LOST" | "FOUND" | "REUNITED"} />
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
                    <p className="text-gray-500 text-sm capitalize">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleShare} className="text-gray-400">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  {pet.color && <div><span className="text-gray-400">Color</span><p className="font-medium capitalize">{pet.color}</p></div>}
                  {pet.size && <div><span className="text-gray-400">Size</span><p className="font-medium capitalize">{pet.size}</p></div>}
                  {pet.age && <div><span className="text-gray-400">Age</span><p className="font-medium">{pet.age}</p></div>}
                </div>

                <div className="flex items-start gap-1.5 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                  <span>{pet.lastSeenAddress}</span>
                </div>
                {pet.lastSeenAt && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDistanceToNow(new Date(pet.lastSeenAt), { addSuffix: true })}</span>
                  </div>
                )}

                {pet.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{pet.description}</p>
                )}

                {pet.owner && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    {pet.owner.photoUrl ? (
                      <img src={pet.owner.photoUrl} className="h-7 w-7 rounded-full object-cover" alt="" />
                    ) : (
                      <User2 className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-xs text-gray-400">Owner</p>
                      <p className="text-sm font-medium text-gray-700">{pet.owner.displayName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isOwner && pet.status !== "REUNITED" && (
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700">Update status</p>
                <div className="flex gap-2">
                  {pet.status === "LOST" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                      onClick={() => updateStatus.mutate({ id: id!, data: { status: "FOUND" } })}
                    >
                      Mark Found
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => updateStatus.mutate({ id: id!, data: { status: "REUNITED" } })}
                  >
                    🎉 Reunited!
                  </Button>
                </div>
              </div>
            )}

            {user && !isOwner && (
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
                onClick={() => setShowSightingForm(true)}
              >
                <Eye className="h-4 w-4" />
                I saw this pet!
              </Button>
            )}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  Tracking Map
                </h2>
                <span className="text-xs text-gray-400">{activeSightings.length} sighting{activeSightings.length !== 1 ? "s" : ""}</span>
              </div>
              <PetMap
                lastSeenLat={Number(pet.lastSeenLat)}
                lastSeenLng={Number(pet.lastSeenLng)}
                sightings={(pet.sightings ?? []).map((s) => ({
                  lat: Number(s.lat),
                  lng: Number(s.lng),
                  address: s.address,
                  seenAt: s.seenAt ?? "",
                  isFlagged: s.isFlagged,
                  sequence: s.sequence,
                }))}
                aiPath={aiPath}
                aiApproved={aiApproved}
                className="h-64"
              />
            </div>

            {aiCache && !aiApproved && isOwner && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Bot className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-800">AI predicted path ready</p>
                    {aiCache.summary && <p className="text-sm text-purple-600 mt-1">{aiCache.summary}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                    onClick={() => approveAi.mutate({ id: id! })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Show on map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50 gap-1.5"
                    onClick={() => denyAi.mutate({ id: id! })}
                  >
                    <XCircle className="h-4 w-4" />
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {aiApproved && aiCache?.summary && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                <Bot className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <p className="text-sm text-purple-700">{aiCache.summary}</p>
              </div>
            )}

            {(pet.sightings ?? []).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-orange-500" />
                    Sightings ({activeSightings.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {(pet.sightings ?? []).map((s) => (
                    <div key={s.id} className={`p-4 flex gap-3 ${s.isFlagged ? "opacity-50" : ""}`}>
                      <img
                        src={s.photoUrl}
                        alt="Sighting"
                        className="h-14 w-14 rounded-lg object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placedog.net/100/100"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="truncate">{s.address}</span>
                          </p>
                          {isOwner && !s.isFlagged && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-300 hover:text-red-500"
                              onClick={() => flagSighting.mutate({ id: s.id })}
                            >
                              <Flag className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.seenAt ? formatDistanceToNow(new Date(s.seenAt), { addSuffix: true }) : ""}
                          {" · "}{s.reporter?.displayName ?? "Anonymous"}
                          {" · "}<span className="capitalize">{s.confidence} confidence</span>
                        </p>
                        {s.notes && <p className="text-xs text-gray-500 mt-1">{s.notes}</p>}
                        {s.isFlagged && <p className="text-xs text-red-400 mt-1">Flagged as invalid</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-orange-500" />
                  Updates
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {(pet.updates ?? []).map((u) => (
                  <div key={u.id} className="p-4 flex gap-3">
                    {u.author?.photoUrl ? (
                      <img src={u.author.photoUrl} className="h-8 w-8 rounded-full object-cover shrink-0" alt="" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User2 className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700">{u.author?.displayName ?? "System"}</p>
                      <p className="text-sm text-gray-600">{u.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {isOwner && (
                <div className="p-4 border-t border-gray-100 space-y-2">
                  <Textarea
                    placeholder="Add an owner note..."
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!note.trim() || createUpdate.isPending}
                    onClick={() => createUpdate.mutate({ petId: id!, data: { content: note } })}
                  >
                    {createUpdate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    Post note
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SightingForm
        petId={id!}
        petName={pet.name}
        open={showSightingForm}
        onClose={() => setShowSightingForm(false)}
      />
    </div>
  );
}
