import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Award, Lock } from "lucide-react";
import goldMedal from "@/assets/gold-medal.png";
import silverMedal from "@/assets/silver-medal.png";
import bronzeMedal from "@/assets/bronze-medal.png";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  requirement_value: number;
  requirement_type: string;
  earned?: boolean;
  earned_at?: string;
}

const Achievements = () => {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    fetchAchievements();
  }, []);


  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("points", { ascending: true });

      if (achievementsError) throw achievementsError;

      // Fetch user's earned achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user.id);

      if (userAchievementsError) throw userAchievementsError;

      // Fetch user stats for progress calculation
      const { data: stats, error: statsError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (statsError) throw statsError;

      setUserStats(stats);

      // Merge data
      const earnedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) || []);
      const earnedMap = new Map(userAchievements?.map((ua) => [ua.achievement_id, ua.earned_at]) || []);

      const mergedAchievements = allAchievements?.map((achievement) => ({
        ...achievement,
        earned: earnedIds.has(achievement.id),
        earned_at: earnedMap.get(achievement.id),
      })) || [];

      setAchievements(mergedAchievements);
    } catch (error: any) {
      toast.error("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (achievement: Achievement) => {
    if (!userStats) return 0;

    let current = 0;
    switch (achievement.requirement_type) {
      case "total_weight":
        current = userStats.total_weight_kg;
        break;
      case "carbon_saved":
        current = userStats.total_carbon_saved_kg;
        break;
      case "streak":
        current = userStats.current_streak_days;
        break;
      case "points":
        current = userStats.total_points;
        break;
      default:
        current = 0;
    }

    return Math.min((current / achievement.requirement_value) * 100, 100);
  };

  const getMedalImage = (points: number) => {
    if (points >= 100) return goldMedal;
    if (points >= 50) return silverMedal;
    return bronzeMedal;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const earnedAchievements = achievements.filter((a) => a.earned);
  const lockedAchievements = achievements.filter((a) => !a.earned);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Achievements</h1>
          <p className="text-muted-foreground">
            Unlock badges and earn rewards for your environmental efforts
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnedAchievements.length}</div>
              <p className="text-xs text-muted-foreground">
                {achievements.length} total achievements
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.total_points || 0}</div>
              <p className="text-xs text-muted-foreground">Achievement points earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {achievements.length > 0 ? Math.round((earnedAchievements.length / achievements.length) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Overall completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Earned Achievements */}
        {earnedAchievements.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Earned Achievements</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {earnedAchievements.map((achievement) => (
                <Card key={achievement.id} className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getMedalImage(achievement.points)} 
                          alt="" 
                          className="h-16 w-16 object-contain"
                        />
                        <div>
                          <CardTitle className="text-base">{achievement.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            <Award className="h-3 w-3 mr-1" />
                            {achievement.points} pts
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{achievement.description}</CardDescription>
                    <p className="text-xs text-muted-foreground mt-2">
                      Earned on {new Date(achievement.earned_at!).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Locked Achievements</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lockedAchievements.map((achievement) => {
                const progress = getProgress(achievement);
                const isComplete = progress >= 100;
                
                return (
                  <Card 
                    key={achievement.id} 
                    className={isComplete ? "border-primary/50 bg-gradient-to-br from-primary/5 to-transparent" : "opacity-75"}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {isComplete ? (
                            <img 
                              src={getMedalImage(achievement.points)} 
                              alt="" 
                              className="h-16 w-16 object-contain"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-base">{achievement.name}</CardTitle>
                            <Badge variant={isComplete ? "secondary" : "outline"} className="mt-1">
                              <Award className="h-3 w-3 mr-1" />
                              {achievement.points} pts
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{achievement.description}</CardDescription>
                      {isComplete && (
                        <Badge variant="default" className="mt-2 bg-gradient-primary w-full justify-center">
                          🎉 100% Complete!
                        </Badge>
                      )}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Achievements;
