import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PawPrint, Plus, LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle, signOut } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignIn() {
    try {
      await signInWithGoogle();
    } catch {
      toast({ title: "Sign-in failed", description: "Please try again.", variant: "destructive" });
    }
  }

  async function handleSignOut() {
    await signOut();
    toast({ title: "Signed out" });
  }

  return (
    <nav className="sticky top-0 z-50 shadow-sm" style={{ background: "#0F172A" }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <PawPrint className="h-6 w-6 text-amber-400" />
          <span>PawTrack</span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {user && (
            <>
              <Link href="/report">
                <Button
                  size="sm"
                  className="font-bold gap-1.5"
                  style={{ background: "#F59E0B", color: "#0F172A", borderRadius: "10px" }}
                >
                  <Plus className="h-4 w-4" />
                  Report Lost Pet
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-slate-300 hover:text-white hover:bg-white/10 ${location === "/dashboard" ? "text-amber-400" : ""}`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Dashboard
                </Button>
              </Link>
            </>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity">
                  {user.photoURL ? (
                    <img src={user.photoURL} className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-400/50" alt="" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                      {user.displayName?.[0] ?? "U"}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-sm text-slate-500 font-normal" disabled>
                  {user.displayName ?? user.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSignIn}
              className="gap-1.5 border-white/20 text-white hover:bg-white/10"
              style={{ background: "transparent" }}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          )}
        </div>

        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-2" style={{ background: "#0F172A" }}>
          {user ? (
            <>
              <Link href="/report" onClick={() => setMobileOpen(false)}>
                <Button
                  size="sm"
                  className="w-full font-bold gap-1.5"
                  style={{ background: "#F59E0B", color: "#0F172A" }}
                >
                  <Plus className="h-4 w-4" />
                  Report Lost Pet
                </Button>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/10">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-full justify-start text-red-400 hover:bg-white/10" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign out
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSignIn}
              className="w-full gap-1.5 border-white/20 text-white hover:bg-white/10"
              style={{ background: "transparent" }}
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
