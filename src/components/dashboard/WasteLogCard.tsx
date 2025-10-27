import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import WasteLogForm from "./WasteLogForm";

const WasteLogCard = () => {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Log Waste</span>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Track your daily waste contributions by category to see your environmental impact
          </p>
        </CardContent>
      </Card>

      <WasteLogForm open={showForm} onOpenChange={setShowForm} />
    </>
  );
};

export default WasteLogCard;
