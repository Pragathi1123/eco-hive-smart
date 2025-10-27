import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Trophy, TrendingUp, Zap, Leaf } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  full_name: string;
  email: string;
  total_points: number;
  total_weight_kg: number;
  total_carbon_saved_kg: number;
  current_streak_days: number;
}

const Leaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [leaderboardByPoints, setLeaderboardByPoints] = useState<LeaderboardEntry[]>([]);
  const [leaderboardByWeight, setLeaderboardByWeight] = useState<LeaderboardEntry[]>([]);
  const [leaderboardByCarbon, setLeaderboardByCarbon] = useState<LeaderboardEntry[]>([]);
  const [leaderboardByStreak, setLeaderboardByStreak] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Fetch all users' stats with their profile info
      const { data: stats, error } = await supabase
        .from("user_stats")
        .select(`
          user_id,
          total_points,
          total_weight_kg,
          total_carbon_saved_kg,
          current_streak_days,
          profiles (full_name, email)
        `)
        .order("total_points", { ascending: false });

      if (error) throw error;

      // Process data for different leaderboards
      const processedData = stats?.map((stat: any) => ({
        user_id: stat.user_id,
        full_name: stat.profiles?.full_name || "Anonymous User",
        email: stat.profiles?.email || "",
        total_points: stat.total_points || 0,
        total_weight_kg: stat.total_weight_kg || 0,
        total_carbon_saved_kg: stat.total_carbon_saved_kg || 0,
        current_streak_days: stat.current_streak_days || 0,
        rank: 0,
      })) || [];

      // Sort and rank by different metrics
      const byPoints = [...processedData]
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      const byWeight = [...processedData]
        .sort((a, b) => b.total_weight_kg - a.total_weight_kg)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      const byCarbon = [...processedData]
        .sort((a, b) => b.total_carbon_saved_kg - a.total_carbon_saved_kg)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      const byStreak = [...processedData]
        .sort((a, b) => b.current_streak_days - a.current_streak_days)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboardByPoints(byPoints);
      setLeaderboardByWeight(byWeight);
      setLeaderboardByCarbon(byCarbon);
      setLeaderboardByStreak(byStreak);
    } catch (error: any) {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="text-muted-foreground">#{rank}</span>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderLeaderboardTable = (data: LeaderboardEntry[], valueKey: keyof LeaderboardEntry, label: string) => (
    <div className="space-y-2">
      {data.slice(0, 50).map((entry) => (
        <Card
          key={entry.user_id}
          className={entry.user_id === currentUserId ? "border-primary bg-primary/5" : ""}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
              <Avatar>
                <AvatarFallback>{getInitials(entry.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">
                  {entry.full_name}
                  {entry.user_id === currentUserId && (
                    <Badge variant="secondary" className="ml-2">You</Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{entry.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {typeof entry[valueKey] === "number" ? entry[valueKey].toFixed(1) : entry[valueKey]}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Community Leaderboard</h1>
          <p className="text-muted-foreground">
            See how you rank against other eco-champions in your community
          </p>
        </div>

        <Tabs defaultValue="points" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="points" className="gap-2">
              <Trophy className="h-4 w-4" />
              Points
            </TabsTrigger>
            <TabsTrigger value="weight" className="gap-2">
              <Leaf className="h-4 w-4" />
              Weight
            </TabsTrigger>
            <TabsTrigger value="carbon" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Carbon
            </TabsTrigger>
            <TabsTrigger value="streak" className="gap-2">
              <Zap className="h-4 w-4" />
              Streak
            </TabsTrigger>
          </TabsList>

          <TabsContent value="points">
            <Card>
              <CardHeader>
                <CardTitle>Top Points Leaders</CardTitle>
                <CardDescription>Users ranked by total achievement points</CardDescription>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(leaderboardByPoints, "total_points", "points")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weight">
            <Card>
              <CardHeader>
                <CardTitle>Top Waste Loggers</CardTitle>
                <CardDescription>Users ranked by total waste logged</CardDescription>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(leaderboardByWeight, "total_weight_kg", "kg logged")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="carbon">
            <Card>
              <CardHeader>
                <CardTitle>Top Carbon Savers</CardTitle>
                <CardDescription>Users ranked by CO₂ emissions reduced</CardDescription>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(leaderboardByCarbon, "total_carbon_saved_kg", "kg CO₂ saved")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streak">
            <Card>
              <CardHeader>
                <CardTitle>Top Streak Holders</CardTitle>
                <CardDescription>Users ranked by current logging streak</CardDescription>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(leaderboardByStreak, "current_streak_days", "days streak")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Leaderboard;
