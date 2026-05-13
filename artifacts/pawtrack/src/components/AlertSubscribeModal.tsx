import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  locationName?: string;
  lat?: number;
  lng?: number;
}

const RADII = [5, 10, 25, 50];
const SPECIES_OPTIONS = ["all", "dog", "cat", "bird", "rabbit", "other"];

export function AlertSubscribeModal({ open, onClose, locationName, lat, lng }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [radius, setRadius] = useState(25);
  const [species, setSpecies] = useState("all");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim() || undefined,
          locationName: locationName ?? "My location",
          lat: lat ?? 0,
          lng: lng ?? 0,
          radiusMiles: radius,
          species,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to subscribe");
      }

      setDone(true);
    } catch (err) {
      toast({
        title: "Subscription failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setDone(false);
    setEmail("");
    setPhone("");
    setRadius(25);
    setSpecies("all");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#EEF2FF" }}>
              <Bell className="h-5 w-5" style={{ color: "#4F46E5" }} />
            </div>
            <DialogTitle style={{ color: "#0F172A" }}>Get Pet Alerts Near You</DialogTitle>
          </div>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: "#10B981" }} />
            <p className="font-semibold text-lg" style={{ color: "#0F172A" }}>Check your email!</p>
            <p className="text-sm" style={{ color: "#475569" }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your alerts.
            </p>
            <Button
              onClick={handleClose}
              className="mt-2"
              style={{ background: "#4F46E5", color: "white", borderRadius: "10px" }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {locationName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{locationName}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="alert-email" style={{ color: "#0F172A" }}>Email address *</Label>
              <Input
                id="alert-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alert-phone" style={{ color: "#0F172A" }}>Phone (optional SMS alerts)</Label>
              <Input
                id="alert-phone"
                type="tel"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "#0F172A" }}>Alert radius</Label>
              <div className="flex gap-2">
                {RADII.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className="flex-1 py-1.5 text-sm font-semibold rounded-lg border transition-colors"
                    style={radius === r
                      ? { background: "#4F46E5", color: "white", border: "1.5px solid #4F46E5" }
                      : { background: "#F8FAFC", color: "#475569", border: "1.5px solid #E2E8F0" }
                    }
                  >
                    {r} mi
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "#0F172A" }}>Species</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIES_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpecies(s)}
                    className="px-3 py-1 text-sm font-semibold rounded-full border capitalize transition-colors"
                    style={species === s
                      ? { background: "#4F46E5", color: "white", border: "1.5px solid #4F46E5" }
                      : { background: "#F8FAFC", color: "#475569", border: "1.5px solid #E2E8F0" }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-bold"
              disabled={loading || !email.trim()}
              style={{ background: "#F59E0B", color: "#0F172A", borderRadius: "10px", padding: "14px" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
              Set Up Free Alerts
            </Button>

            <p className="text-xs text-center" style={{ color: "#94A3B8" }}>
              Free to use. Unsubscribe anytime — no account needed.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
