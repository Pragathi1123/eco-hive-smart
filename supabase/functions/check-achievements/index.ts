import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user stats
    const { data: userStats, error: statsError } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError) throw statsError;

    // Get all achievements
    const { data: achievements, error: achievementsError } = await supabaseClient
      .from('achievements')
      .select('*');

    if (achievementsError) throw achievementsError;

    // Get already earned achievements
    const { data: earnedAchievements, error: earnedError } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (earnedError) throw earnedError;

    const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);
    const newlyEarned = [];

    // Check each achievement
    for (const achievement of achievements || []) {
      if (earnedIds.has(achievement.id)) continue;

      let currentValue = 0;
      switch (achievement.requirement_type) {
        case 'total_weight':
          currentValue = userStats.total_weight_kg;
          break;
        case 'carbon_saved':
          currentValue = userStats.total_carbon_saved_kg;
          break;
        case 'streak':
          currentValue = userStats.current_streak_days;
          break;
        case 'points':
          currentValue = userStats.total_points;
          break;
      }

      // If requirement met, award achievement
      if (currentValue >= achievement.requirement_value) {
        const { error: insertError } = await supabaseClient
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });

        if (!insertError) {
          // Award points for earning achievement
          const { error: updateError } = await supabaseClient
            .from('user_stats')
            .update({
              total_points: userStats.total_points + achievement.points,
            })
            .eq('user_id', user.id);

          if (!updateError) {
            newlyEarned.push({
              name: achievement.name,
              points: achievement.points,
              icon: achievement.icon,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newlyEarned,
        message: newlyEarned.length > 0 
          ? `Congratulations! You earned ${newlyEarned.length} new achievement${newlyEarned.length > 1 ? 's' : ''}!`
          : 'No new achievements yet. Keep going!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking achievements:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check achievements' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});