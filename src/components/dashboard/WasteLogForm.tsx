import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface WasteCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface WasteLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WasteLogForm = ({ open, onOpenChange }: WasteLogFormProps) => {
  const [categories, setCategories] = useState<WasteCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("waste_categories")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load categories");
      return;
    }

    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !weight) {
      toast.error("Please select a category and enter weight");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("waste_logs").insert({
        user_id: user.id,
        category_id: selectedCategory,
        weight_kg: parseFloat(weight),
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Waste entry logged successfully!");
      onOpenChange(false);
      setSelectedCategory("");
      setWeight("");
      setNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to log waste");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Waste Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label>Select Category</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedCategory === category.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{
                    borderColor: selectedCategory === category.id ? category.color : undefined,
                  }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <div style={{ color: category.color }}>
                        {getIcon(category.icon)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {category.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              placeholder="0.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Logging..." : "Log Entry"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WasteLogForm;
