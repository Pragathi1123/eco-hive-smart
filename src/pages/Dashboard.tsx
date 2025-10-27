import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import WasteLogCard from "@/components/dashboard/WasteLogCard";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, TrendingUp, Award, Zap } from "lucide-react";
import { toast } from "sonner";

interface UserStats {
  total_weight_kg: number;
  total_carbon_saved_kg: number;
  total_points: number;
  current_streak_days: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<UserStats>({
    total_weight_kg: 0,
    total_carbon_saved_kg: 0,
    total_points: 0,
    current_streak_days: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();

    // Subscribe to waste_logs changes
    const channel = supabase
      .channel("waste_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waste_logs",
        },
        () => {
          fetchUserStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setStats({
          total_weight_kg: data.total_weight_kg || 0,
          total_carbon_saved_kg: data.total_carbon_saved_kg || 0,
          total_points: data.total_points || 0,
          current_streak_days: data.current_streak_days || 0,
        });
      }
    } catch (error: any) {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Track your environmental impact and progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Waste Logged"
            value={`${stats.total_weight_kg.toFixed(1)} kg`}
            icon={Leaf}
            gradient="success"
            description="Properly sorted and tracked"
          />
          <StatsCard
            title="Carbon Saved"
            value={`${stats.total_carbon_saved_kg.toFixed(1)} kg`}
            icon={TrendingUp}
            gradient="accent"
            description="CO₂ emissions reduced"
          />
          <StatsCard
            title="Points Earned"
            value={stats.total_points}
            icon={Award}
            gradient="primary"
            description="Keep going for more rewards!"
          />
          <StatsCard
            title="Current Streak"
            value={`${stats.current_streak_days} days`}
            icon={Zap}
            gradient="success"
            description="Log daily to maintain streak"
          />
        </div>

        {/* Waste Log Card */}
        <WasteLogCard />

        {/* Recent Activity would go here */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <p className="text-muted-foreground text-sm">
              Your recent waste logs will appear here
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Log waste daily to maintain your streak</li>
              <li>• Try to reduce plastic usage this week</li>
              <li>• Compost organic waste when possible</li>
              <li>• Share your progress with the community</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
