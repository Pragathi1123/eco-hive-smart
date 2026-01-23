import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const AllUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles - RLS policy allows viewing all users
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Generate creative letter emoji based on first letter of name
  const getLetterEmoji = (name: string | null, email: string) => {
    const letterEmojis: Record<string, string> = {
      'A': '🅰️', 'B': '🅱️', 'C': '©️', 'D': '🌀', 'E': '📧',
      'F': '🎏', 'G': '🌀', 'H': '♓', 'I': 'ℹ️', 'J': '🎷',
      'K': '🎋', 'L': '🛴', 'M': 'Ⓜ️', 'N': '♑', 'O': '⭕',
      'P': '🅿️', 'Q': '🎯', 'R': '®️', 'S': '💲', 'T': '✝️',
      'U': '⛎', 'V': '✅', 'W': '〰️', 'X': '❌', 'Y': '💴',
      'Z': '💤'
    };
    
    const source = (name || email).trim().toUpperCase();
    const firstLetter = source.charAt(0);
    
    return letterEmojis[firstLetter] || '🔤';
  };

  // Get colorful gradient based on first letter
  const getCardGradient = (name: string | null, email: string) => {
    const gradients = [
      'from-pink/20 to-purple/20',
      'from-cyan/20 to-primary/20',
      'from-orange/20 to-secondary/20',
      'from-lime/20 to-success/20',
      'from-accent/20 to-warning/20',
      'from-secondary/20 to-pink/20',
      'from-purple/20 to-cyan/20',
      'from-primary/20 to-lime/20',
    ];
    
    const source = (name || email).toLowerCase();
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      hash = source.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient-rainbow">Community Members</h1>
            <p className="text-muted-foreground mt-2">
              All registered users in your institution
            </p>
          </div>
          <Badge className="text-lg px-5 py-2.5 bg-gradient-candy text-white border-0 shadow-glow-pink animate-float">
            <Users className="mr-2 h-5 w-5" />
            {users.length} Members
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user, index) => (
            <Card 
              key={user.id} 
              className={`hover-lift border-2 border-transparent hover:border-primary/30 bg-gradient-to-br ${getCardGradient(user.full_name, user.email)} animate-fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                    <AvatarFallback className="bg-gradient-ocean text-3xl">
                      {getLetterEmoji(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate font-semibold">
                      {user.full_name || "Anonymous User"}
                    </CardTitle>
                    <CardDescription className="truncate text-sm">{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-muted-foreground">
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <Card className="border-dashed border-2 bg-gradient-to-br from-muted/50 to-muted">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-gradient-candy flex items-center justify-center mb-6 animate-bounce-in">
                <Users className="h-10 w-10 text-white" />
              </div>
              <p className="text-muted-foreground text-lg">No users found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AllUsers;
