import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, MapPin, Calendar, Eye, Bot, CheckCircle2, XCircle,
  Flag, MessageSquare, Loader2, User2, AlertTriangle, Share2, Bell
} from "lucide-react";
import { useGetPet, useUpdatePetStatus, useApproveAiPath, useDenyAiPath, useFlagSighting, useCreatePetUpdate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PetMap } from "@/components/PetMap";
import { SightingForm } from "@/components/SightingForm";
import { AuthModal } from "@/components/AuthModal";
import { AlertSubscribeModal } from "@/components/AlertSubscribeModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { joinPetRoom, leavePetRoom, getSocket } from "@/lib/socket";

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
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

  function handleAddSighting() {
    if (user) {
      setShowSightingForm(true);
    } else {
      setShowAuthModal(true);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4F46E5" }} />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-10 w-10" style={{ color: "#94A3B8" }} />
        <p style={{ color: "#475569" }}>Pet not found</p>
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
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-80 transition-opacity" style={{ color: "#475569" }}>
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)", border: "1px solid #E2E8F0" }}>
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
                    <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>{pet.name}</h1>
                    <p className="text-sm capitalize" style={{ color: "#475569" }}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleShare} style={{ color: "#94A3B8" }}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: "#475569" }}>
                  {pet.color && <div><span style={{ color: "#94A3B8" }}>Color</span><p className="font-medium capitalize">{pet.color}</p></div>}
                  {pet.size && <div><span style={{ color: "#94A3B8" }}>Size</span><p className="font-medium capitalize">{pet.size}</p></div>}
                  {pet.age && <div><span style={{ color: "#94A3B8" }}>Age</span><p className="font-medium">{pet.age}</p></div>}
                </div>

                <div className="flex items-start gap-1.5 text-sm" style={{ color: "#475569" }}>
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#94A3B8" }} />
                  <span>{pet.lastSeenAddress}</span>
                </div>
                {pet.lastSeenAt && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "#475569" }}>
                    <Calendar className="h-4 w-4" style={{ color: "#94A3B8" }} />
                    <span>{formatDistanceToNow(new Date(pet.lastSeenAt), { addSuffix: true })}</span>
                  </div>
                )}

                {pet.description && (
                  <p className="text-sm rounded-lg p-3" style={{ color: "#475569", background: "#F8FAFC" }}>{pet.description}</p>
                )}

                {pet.owner && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {pet.owner.photoUrl ? (
                      <img src={pet.owner.photoUrl} className="h-7 w-7 rounded-full object-cover" alt="" />
                    ) : (
                      <User2 className="h-5 w-5" style={{ color: "#94A3B8" }} />
                    )}
                    <div>
                      <p className="text-xs" style={{ color: "#94A3B8" }}>Owner</p>
                      <p className="text-sm font-medium" style={{ color: "#0F172A" }}>{pet.owner.displayName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Owner status controls */}
            {isOwner && pet.status !== "REUNITED" && (
              <div className="bg-white rounded-2xl p-4 space-y-2" style={{ border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
                <p className="text-sm font-semibold" style={{ color: "#0F172A" }}>Update status</p>
                <div className="flex gap-2">
                  {pet.status === "LOST" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      style={{ color: "#D97706", borderColor: "#FDE68A" }}
                      onClick={() => updateStatus.mutate({ id: id!, data: { status: "FOUND" } })}
                    >
                      Mark Found
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 text-white"
                    style={{ background: "#10B981", borderRadius: "10px" }}
                    onClick={() => updateStatus.mutate({ id: id!, data: { status: "REUNITED" } })}
                  >
                    🎉 Reunited!
                  </Button>
                </div>
              </div>
            )}

            {/* Always-visible Add Sighting CTA */}
            {!isOwner && (
              <div className="space-y-2">
                <button
                  onClick={handleAddSighting}
                  className="w-full text-left font-bold transition-opacity hover:opacity-90 active:opacity-80"
                  style={{
                    background: "#F59E0B",
                    color: "#0F172A",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    fontSize: "0.9375rem",
                    display: "block",
                  }}
                >
                  📍 I've Seen This Pet — Add Sighting
                </button>
                {!user && (
                  <p className="text-center" style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
                    Have information? Sign in with Google to help.
                  </p>
                )}
                <button
                  className="flex items-center gap-1.5 text-sm w-full justify-center"
                  style={{ color: "#4F46E5" }}
                  onClick={() => setShowAlertModal(true)}
                >
                  <Bell className="h-3.5 w-3.5" />
                  Get alerts for pets lost near you →
                </button>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-3 space-y-4">
            {/* Map */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2" style={{ color: "#0F172A" }}>
                  <MapPin className="h-4 w-4" style={{ color: "#4F46E5" }} />
                  Tracking Map
                </h2>
                <span className="text-xs" style={{ color: "#94A3B8" }}>{activeSightings.length} sighting{activeSightings.length !== 1 ? "s" : ""}</span>
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

            {/* AI path pending */}
            {aiCache && !aiApproved && isOwner && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
                <div className="flex items-start gap-2">
                  <Bot className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#8B5CF6" }} />
                  <div>
                    <p className="font-semibold" style={{ color: "#5B21B6" }}>AI predicted path ready</p>
                    {aiCache.summary && <p className="text-sm mt-1" style={{ color: "#7C3AED" }}>{aiCache.summary}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-white gap-1.5"
                    style={{ background: "#8B5CF6", borderRadius: "10px" }}
                    onClick={() => approveAi.mutate({ id: id! })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Show on map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    style={{ borderColor: "#DDD6FE", color: "#8B5CF6" }}
                    onClick={() => denyAi.mutate({ id: id! })}
                  >
                    <XCircle className="h-4 w-4" />
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {aiApproved && aiCache?.summary && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
                <Bot className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#8B5CF6" }} />
                <p className="text-sm" style={{ color: "#7C3AED" }}>{aiCache.summary}</p>
              </div>
            )}

            {/* Sightings */}
            {(pet.sightings ?? []).length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold flex items-center gap-2" style={{ color: "#0F172A" }}>
                    <Eye className="h-4 w-4" style={{ color: "#4F46E5" }} />
                    Sightings ({activeSightings.length})
                  </h2>
                </div>

                {/* Sighting CTA at top */}
                {!isOwner && (
                  <div
                    className="px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-100"
                    style={{ background: "#FFFBEB" }}
                  >
                    <p className="text-sm font-medium" style={{ color: "#92400E" }}>
                      Seen this pet? Add your sighting and help bring them home.
                    </p>
                    <button
                      onClick={handleAddSighting}
                      className="text-sm font-bold whitespace-nowrap"
                      style={{ color: "#D97706" }}
                    >
                      Add →
                    </button>
                  </div>
                )}

                <div className="divide-y divide-slate-50">
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
                          <p className="text-sm font-medium flex items-center gap-1" style={{ color: "#0F172A" }}>
                            <MapPin className="h-3 w-3 shrink-0" style={{ color: "#94A3B8" }} />
                            <span className="truncate">{s.address}</span>
                          </p>
                          {isOwner && !s.isFlagged && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:text-red-500"
                              style={{ color: "#94A3B8" }}
                              onClick={() => flagSighting.mutate({ id: s.id })}
                            >
                              <Flag className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                          {s.seenAt ? formatDistanceToNow(new Date(s.seenAt), { addSuffix: true }) : ""}
                          {" · "}{s.reporter?.displayName ?? "Anonymous"}
                          {" · "}<span className="capitalize">{s.confidence} confidence</span>
                        </p>
                        {s.notes && <p className="text-xs mt-1" style={{ color: "#475569" }}>{s.notes}</p>}
                        {s.isFlagged && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>Flagged as invalid</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No sightings yet — still show CTA */}
            {(pet.sightings ?? []).length === 0 && !isOwner && (
              <div
                className="bg-white rounded-2xl p-5 flex items-center justify-between gap-3"
                style={{ border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}
              >
                <div>
                  <p className="font-semibold" style={{ color: "#0F172A" }}>No sightings yet</p>
                  <p className="text-sm" style={{ color: "#94A3B8" }}>Be the first to help find {pet.name}.</p>
                </div>
                <button
                  onClick={handleAddSighting}
                  className="text-sm font-bold whitespace-nowrap"
                  style={{ color: "#4F46E5" }}
                >
                  Add Sighting →
                </button>
              </div>
            )}

            {/* Updates */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold flex items-center gap-2" style={{ color: "#0F172A" }}>
                  <MessageSquare className="h-4 w-4" style={{ color: "#4F46E5" }} />
                  Updates
                </h2>
              </div>
              <div className="divide-y divide-slate-50">
                {(pet.updates ?? []).map((u) => (
                  <div key={u.id} className="p-4 flex gap-3">
                    {u.author?.photoUrl ? (
                      <img src={u.author.photoUrl} className="h-8 w-8 rounded-full object-cover shrink-0" alt="" />
                    ) : (
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#F1F5F9" }}>
                        <User2 className="h-4 w-4" style={{ color: "#94A3B8" }} />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0F172A" }}>{u.author?.displayName ?? "System"}</p>
                      <p className="text-sm" style={{ color: "#475569" }}>{u.content}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                        {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {isOwner && (
                <div className="p-4 border-t border-slate-100 space-y-2">
                  <Textarea
                    placeholder="Add an owner note..."
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-sm"
                    style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
                  />
                  <Button
                    size="sm"
                    className="font-bold text-white"
                    style={{ background: "#4F46E5", borderRadius: "10px" }}
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

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowSightingForm(true)}
        reason="Sign in with Google to report a sighting and help bring this pet home."
      />

      <AlertSubscribeModal
        open={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        locationName={pet.lastSeenAddress}
        lat={Number(pet.lastSeenLat)}
        lng={Number(pet.lastSeenLng)}
      />
    </div>
  );
}
