import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface WasteData {
  date: string;
  weight: number;
  carbon_saved: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeSeriesData, setTimeSeriesData] = useState<WasteData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch waste logs with categories
      const { data: logs, error } = await supabase
        .from("waste_logs")
        .select(`
          created_at,
          weight_kg,
          category_id,
          waste_categories (name, color, carbon_savings_kg)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Process time series data
      const timeSeriesMap = new Map<string, { weight: number; carbon: number }>();
      const categoryMap = new Map<string, { weight: number; color: string }>();

      logs?.forEach((log: any) => {
        const date = new Date(log.created_at).toLocaleDateString();
        const category = log.waste_categories.name;
        const carbonSaved = log.weight_kg * log.waste_categories.carbon_savings_kg;

        // Time series aggregation
        const existing = timeSeriesMap.get(date) || { weight: 0, carbon: 0 };
        timeSeriesMap.set(date, {
          weight: existing.weight + log.weight_kg,
          carbon: existing.carbon + carbonSaved,
        });

        // Category aggregation
        const existingCategory = categoryMap.get(category) || { weight: 0, color: log.waste_categories.color };
        categoryMap.set(category, {
          weight: existingCategory.weight + log.weight_kg,
          color: log.waste_categories.color || "#10b981",
        });
      });

      // Convert to chart data
      const timeSeries = Array.from(timeSeriesMap.entries()).map(([date, data]) => ({
        date,
        weight: Number(data.weight.toFixed(2)),
        carbon_saved: Number(data.carbon.toFixed(2)),
      }));

      const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: Number(data.weight.toFixed(2)),
        color: data.color,
      }));

      setTimeSeriesData(timeSeries);
      setCategoryData(categories);
    } catch (error: any) {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">Visualize your waste management journey</p>
        </div>

        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Waste Logged Over Time</CardTitle>
            <CardDescription>Track your daily waste logging progress</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} name="Weight (kg)" />
                <Line type="monotone" dataKey="carbon_saved" stroke="hsl(var(--accent))" strokeWidth={2} name="CO₂ Saved (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Waste by Category</CardTitle>
              <CardDescription>Distribution of waste types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Total weight by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-sm" />
                  <YAxis className="text-sm" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Weight (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
