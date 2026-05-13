import { Link, useSearch } from "wouter";
import { CheckCircle2, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AlertConfirmed() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const location = params.get("location");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#F8FAFC" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "#ECFDF5" }}>
            <CheckCircle2 className="h-10 w-10" style={{ color: "#10B981" }} />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0F172A" }}>
            You're all set! 🐾
          </h1>
          <p className="text-base" style={{ color: "#475569", lineHeight: 1.6 }}>
            Alerts are active{location ? <> for <strong>{location}</strong></> : ""}.
            You'll be notified by email whenever a pet goes missing near you.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/">
            <Button
              className="w-full font-bold"
              style={{ background: "#F59E0B", color: "#0F172A", borderRadius: "10px" }}
            >
              <PawPrint className="h-4 w-4 mr-2" />
              Browse Lost Pets →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
