import { Link } from "wouter";
import { BellOff, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AlertSubscribeModal } from "@/components/AlertSubscribeModal";

export default function Unsubscribed() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#F8FAFC" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "#F1F5F9" }}>
            <BellOff className="h-10 w-10" style={{ color: "#94A3B8" }} />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0F172A" }}>
            You've been unsubscribed
          </h1>
          <p className="text-base" style={{ color: "#475569", lineHeight: 1.6 }}>
            You'll no longer receive PawTrack alert emails. You can resubscribe anytime.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full font-bold"
            style={{ background: "#4F46E5", color: "white", borderRadius: "10px" }}
            onClick={() => setShowModal(true)}
          >
            <PawPrint className="h-4 w-4 mr-2" />
            Resubscribe
          </Button>
          <Link href="/">
            <Button variant="ghost" className="w-full" style={{ color: "#475569" }}>
              Go Home
            </Button>
          </Link>
        </div>
      </div>

      <AlertSubscribeModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
