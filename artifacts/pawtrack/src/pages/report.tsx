import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { ChevronRight, ChevronLeft, PawPrint, Upload, Loader2, MapPin, Check } from "lucide-react";
import { useCreatePet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

interface PetForm {
  name: string;
  species: string;
  breed: string;
  color: string;
  size: string;
  age: string;
  description: string;
  photoUrl: string;
  lastSeenAddress: string;
  lastSeenAt: string;
  lat: number;
  lng: number;
}

const STEPS = ["Photo", "Basic Info", "Description", "Location", "Confirm"];

export default function Report() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<PetForm>({
    defaultValues: {
      lastSeenAt: new Date().toISOString().slice(0, 16),
      species: "dog",
      size: "medium",
    },
  });

  const values = watch();

  const createPet = useCreatePet({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Pet reported!", description: "Your report has been posted. We hope you find them soon!" });
        navigate(`/pet/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create report. Please try again.", variant: "destructive" });
      },
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setPhotoUrl(url);
      setValue("photoUrl", url);
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function getLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("lat", pos.coords.latitude);
        setValue("lng", pos.coords.longitude);
        setLocating(false);
        toast({ title: "Location set", description: "Using your current location." });
      },
      () => {
        setLocating(false);
        toast({ title: "Location unavailable", variant: "destructive" });
      },
    );
  }

  async function onSubmit(data: PetForm) {
    createPet.mutate({
      data: {
        name: data.name,
        species: data.species,
        breed: data.breed || undefined,
        color: data.color,
        size: data.size,
        age: data.age || undefined,
        description: data.description,
        photoUrl: photoUrl,
        lastSeenAddress: data.lastSeenAddress,
        lastSeenLat: data.lat,
        lastSeenLng: data.lng,
        lastSeenAt: new Date(data.lastSeenAt).toISOString(),
      },
    });
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <PawPrint className="h-12 w-12 mx-auto text-orange-300 mb-3" />
          <h2 className="text-xl font-semibold text-gray-700">Sign in to report a pet</h2>
          <p className="text-gray-400 mt-1 text-sm">You need to be signed in to create a lost pet report</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <PawPrint className="h-8 w-8 mx-auto text-orange-500 mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Report a Lost Pet</h1>
        </div>

        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    i < step
                      ? "bg-orange-500 text-white"
                      : i === step
                      ? "bg-orange-100 text-orange-600 border-2 border-orange-500"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1 hidden sm:block ${i === step ? "text-orange-600 font-medium" : "text-gray-400"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-orange-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Upload a clear photo</h2>
                <p className="text-sm text-gray-500">A good photo helps people identify your pet</p>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-orange-300 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {photoUrl ? (
                    <img src={photoUrl} className="mx-auto max-h-48 rounded-xl object-cover" alt="Pet photo" />
                  ) : (
                    <div className="py-8">
                      {uploading ? (
                        <Loader2 className="h-10 w-10 mx-auto text-orange-400 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                          <p className="text-sm font-medium text-gray-600">Click to upload photo</p>
                          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP up to 10MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Basic information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Pet's name *</Label>
                    <Input placeholder="e.g. Buddy" {...register("name", { required: "Name is required" })} />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Species *</Label>
                    <Controller
                      name="species"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["dog", "cat", "bird", "rabbit", "other"].map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Size</Label>
                    <Controller
                      name="size"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["small", "medium", "large", "xl"].map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Breed</Label>
                    <Input placeholder="e.g. Golden Retriever" {...register("breed")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Color *</Label>
                    <Input placeholder="e.g. Golden, Black & White" {...register("color", { required: "Color is required" })} />
                    {errors.color && <p className="text-xs text-red-500">{errors.color.message}</p>}
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Approximate age</Label>
                    <Input placeholder="e.g. 3 years, 6 months" {...register("age")} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Description</h2>
                <p className="text-sm text-gray-500">Describe any distinguishing features or markings</p>
                <Textarea
                  placeholder="e.g. Has a red collar with tag, distinctive patch on left eye, friendly to strangers..."
                  rows={6}
                  {...register("description", { required: "Description is required" })}
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Last known location</h2>
                <div className="space-y-1.5">
                  <Label>Address or landmark *</Label>
                  <Input
                    placeholder="e.g. Central Park near the fountain"
                    {...register("lastSeenAddress", { required: "Location is required" })}
                  />
                  {errors.lastSeenAddress && <p className="text-xs text-red-500">{errors.lastSeenAddress.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Date & time last seen *</Label>
                  <Input
                    type="datetime-local"
                    {...register("lastSeenAt", { required: "Date is required" })}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                  onClick={getLocation}
                  disabled={locating}
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  {values.lat ? "Location set ✓" : "Use my current location (GPS)"}
                </Button>
                {values.lat && (
                  <p className="text-xs text-green-600 text-center">
                    GPS: {values.lat.toFixed(4)}, {values.lng.toFixed(4)}
                  </p>
                )}
                {!values.lat && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 40.7128"
                        {...register("lat", { required: "Coordinates required", valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. -74.0060"
                        {...register("lng", { required: "Coordinates required", valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Confirm your report</h2>
                <div className="flex gap-4 bg-gray-50 rounded-xl p-4">
                  {photoUrl && (
                    <img src={photoUrl} className="h-20 w-20 rounded-lg object-cover shrink-0" alt={values.name} />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{values.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{values.species} · {values.breed || "Mixed"} · {values.color}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {values.lastSeenAddress}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Your report will be visible to the community. Anyone can report sightings to help you find your pet.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              {step > 0 && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => {
                    if (step === 0 && !photoUrl) {
                      toast({ title: "Photo required", variant: "destructive" });
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={createPet.isPending}
                >
                  {createPet.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PawPrint className="h-4 w-4 mr-2" />
                  )}
                  Post Report
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
