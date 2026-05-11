import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Camera, MapPin, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateSighting } from "@workspace/api-client-react";

interface Props {
  petId: string;
  petName: string;
  open: boolean;
  onClose: () => void;
}

interface FormData {
  notes: string;
  address: string;
}

export function SightingForm({ petId, petName, open, onClose }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [confidence, setConfidence] = useState<string>("medium");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const createSighting = useCreateSighting({
    mutation: {
      onSuccess: () => {
        toast({ title: "Sighting reported!", description: "Thank you for helping find this pet." });
        reset();
        setPhotoUrl("");
        onClose();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to submit sighting.", variant: "destructive" });
      },
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/uploads/image", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setPhotoUrl(url);
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: FormData) {
    if (!photoUrl) {
      toast({ title: "Photo required", description: "Please upload a photo of the sighting.", variant: "destructive" });
      return;
    }

    if (!navigator.geolocation) {
      toast({ title: "Geolocation unavailable", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        createSighting.mutate({
          petId,
          data: {
            photoUrl,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: data.address,
            seenAt: new Date().toISOString(),
            notes: data.notes || undefined,
            confidence: confidence as "high" | "medium" | "low",
          },
        });
      },
      () => {
        toast({ title: "Location denied", description: "Please allow location access to report a sighting.", variant: "destructive" });
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Report Sighting of {petName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Photo of sighting *</Label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-orange-300 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {photoUrl ? (
                <img src={photoUrl} className="mx-auto h-32 object-cover rounded-lg" alt="Sighting" />
              ) : (
                <div className="py-4">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 mx-auto text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload photo</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Where did you see them? *</Label>
            <Input
              id="address"
              placeholder="Street address or landmark"
              {...register("address", { required: "Location is required" })}
            />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Confidence level</Label>
            <Select value={confidence} onValueChange={setConfidence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High — definitely this pet</SelectItem>
                <SelectItem value="medium">Medium — looks very similar</SelectItem>
                <SelectItem value="low">Low — might be them</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Additional notes</Label>
            <Textarea
              id="notes"
              placeholder="Direction of travel, behavior, condition..."
              rows={3}
              {...register("notes")}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              disabled={createSighting.isPending || uploading}
            >
              {createSighting.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
              Submit Sighting
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
