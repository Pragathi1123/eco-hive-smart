import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Scale, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ArduinoWeight = () => {
  const [arduinoIP, setArduinoIP] = useState(localStorage.getItem("arduinoIP") || "");
  const [refreshInterval, setRefreshInterval] = useState(
    parseInt(localStorage.getItem("refreshInterval") || "2000")
  );
  const [connected, setConnected] = useState(false);
  const [weight, setWeight] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPolling && arduinoIP) {
      fetchWeight();
      intervalId = setInterval(fetchWeight, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling, arduinoIP, refreshInterval]);

  const fetchWeight = async () => {
    if (!arduinoIP) {
      toast.error("Please enter Arduino IP address");
      return;
    }

    try {
      const response = await fetch(`http://${arduinoIP}/weight`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch weight");

      const data = await response.json();
      setWeight(data.weight || 0);
      setLastUpdate(new Date());
      setConnected(true);
    } catch (error) {
      console.error("Error fetching weight:", error);
      setConnected(false);
      toast.error("Failed to connect to Arduino. Check IP and network.");
    }
  };

  const handleConnect = () => {
    if (!arduinoIP) {
      toast.error("Please enter Arduino IP address");
      return;
    }

    localStorage.setItem("arduinoIP", arduinoIP);
    localStorage.setItem("refreshInterval", refreshInterval.toString());
    setIsPolling(true);
    toast.success("Connecting to Arduino...");
  };

  const handleDisconnect = () => {
    setIsPolling(false);
    setConnected(false);
    setWeight(null);
    toast.info("Disconnected from Arduino");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Arduino Weight Sensor</h1>
          <p className="text-muted-foreground mt-2">
            Connect to your Arduino device to monitor real-time weight measurements
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Connection Settings
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? (
                  <>
                    <Wifi className="mr-1 h-3 w-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="mr-1 h-3 w-3" />
                    Disconnected
                  </>
                )}
              </Badge>
            </CardTitle>
            <CardDescription>
              Configure your Arduino device connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="arduino-ip">Arduino IP Address</Label>
              <Input
                id="arduino-ip"
                placeholder="e.g., 192.168.1.100"
                value={arduinoIP}
                onChange={(e) => setArduinoIP(e.target.value)}
                disabled={isPolling}
              />
              <p className="text-xs text-muted-foreground">
                Make sure your Arduino and device are on the same Wi-Fi network
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refresh-interval">Refresh Interval (ms)</Label>
              <Input
                id="refresh-interval"
                type="number"
                placeholder="2000"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 2000)}
                disabled={isPolling}
                min="500"
                step="500"
              />
              <p className="text-xs text-muted-foreground">
                How often to fetch weight data (minimum 500ms)
              </p>
            </div>

            <div className="flex gap-4">
              {!isPolling ? (
                <Button onClick={handleConnect} className="w-full">
                  <Wifi className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              ) : (
                <Button onClick={handleDisconnect} variant="destructive" className="w-full">
                  <WifiOff className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isPolling && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Real-Time Weight Data
              </CardTitle>
              {lastUpdate && (
                <CardDescription>
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl font-bold text-primary mb-2">
                  {weight !== null ? weight.toFixed(2) : "--"}
                </div>
                <div className="text-2xl text-muted-foreground">kg</div>
                {connected && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Updating every {refreshInterval / 1000}s
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ArduinoWeight;
