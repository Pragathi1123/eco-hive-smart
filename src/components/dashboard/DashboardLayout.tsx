import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Leaf, Home, BarChart3, Award, BookOpen, LogOut, Menu, Scan, Scale, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={`flex ${mobile ? 'flex-col' : 'flex-col'} gap-2`}>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard")}
      >
        <Home className="mr-2 h-4 w-4" />
        Dashboard
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard/analytics")}
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        Analytics
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard/achievements")}
      >
        <Award className="mr-2 h-4 w-4" />
        Achievements
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard/leaderboard")}
      >
        <Award className="mr-2 h-4 w-4" />
        Leaderboard
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard/education")}
      >
        <BookOpen className="mr-2 h-4 w-4" />
        Learn
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard/barcode-scanner")}
      >
        <Scan className="mr-2 h-4 w-4" />
        Barcode Scanner
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard/arduino-weight")}
      >
        <Scale className="mr-2 h-4 w-4" />
        Weight Sensor
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => navigate("/dashboard/all-users")}
      >
        <Users className="mr-2 h-4 w-4" />
        All Users
      </Button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <Leaf className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-lg">EcoTrack</span>
                </div>
                <NavLinks mobile />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">EcoTrack</span>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-64 border-r bg-card/50 min-h-[calc(100vh-4rem)] p-4">
          <NavLinks />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
