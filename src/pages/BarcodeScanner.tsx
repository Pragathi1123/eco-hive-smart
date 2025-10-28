import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, X, Loader2, Upload, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface ProductInfo {
  name: string;
  description: string;
  recyclability: string;
  category: string;
  barcode?: string;
  confidence?: number;
}

const BarcodeScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startScanning = async () => {
    try {
      // Stop any existing scanner first
      if (scannerRef.current) {
        await stopScanning();
      }

      // Clear the reader div
      const readerElement = document.getElementById("reader");
      if (readerElement) {
        readerElement.innerHTML = "";
      }

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      // Show scanning state immediately
      setScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        { 
          fps: 10, 
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          console.log("Barcode detected:", decodedText);
          setLoading(true);
          await stopScanning();
          await fetchProductInfo(decodedText);
        },
        (errorMessage) => {
          // This is called for every frame where no code is detected - ignore
        }
      );
      
      toast.success("Camera started! Point at a barcode to scan.");
    } catch (err: any) {
      console.error("Scanner error:", err);
      setScanning(false);
      
      if (err.name === "NotAllowedError") {
        toast.error("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === "NotFoundError") {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Failed to start camera. Please check permissions and try again.");
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
  };

  const fetchProductInfo = async (barcode: string) => {
    try {
      // Try Open Food Facts API first
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        setProductInfo({
          name: product.product_name || "Unknown Product",
          description: product.generic_name || product.categories || "No description available",
          recyclability: determineRecyclability(product),
          category: product.categories_tags?.[0]?.replace("en:", "") || "Electronic",
          barcode: barcode,
        });
      } else {
        // Fallback for electronics/unknown items
        setProductInfo({
          name: "Electronic Item",
          description: "Electronic waste item detected. Please dispose of properly at designated e-waste collection points.",
          recyclability: "E-Waste - Special Handling Required",
          category: "Electronic",
          barcode: barcode,
        });
      }
      toast.success("Product scanned successfully!");
    } catch (error) {
      toast.error("Failed to fetch product information");
      setProductInfo({
        name: "Unknown Item",
        description: "Could not retrieve product information. Barcode: " + barcode,
        recyclability: "Unknown - Please consult local recycling guidelines",
        category: "Unknown",
        barcode: barcode,
      });
    } finally {
      setLoading(false);
    }
  };

  const determineRecyclability = (product: any): string => {
    const packaging = product.packaging_tags || [];
    if (packaging.some((p: string) => p.includes("recyclable"))) {
      return "Recyclable";
    } else if (packaging.some((p: string) => p.includes("plastic"))) {
      return "Check Local Guidelines - Plastic";
    }
    return "E-Waste - Special Handling Required";
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Call edge function for waste detection
        const { data, error } = await supabase.functions.invoke("detect-waste", {
          body: { imageBase64: base64String },
        });

        if (error) {
          throw error;
        }

        setProductInfo({
          name: data.category + " Waste",
          description: data.description,
          recyclability: data.recyclability === "recyclable" 
            ? "Recyclable" 
            : data.recyclability === "special-handling" 
            ? "Special Handling Required" 
            : "Non-Recyclable",
          category: data.category,
          confidence: data.confidence,
        });
        
        toast.success("Image analyzed successfully!");
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanning();
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Barcode Scanner</h1>
          <p className="text-muted-foreground mt-2">
            Scan product barcodes to get recycling information
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Barcode Scanner</CardTitle>
            <CardDescription>
              {scanning 
                ? "Point your camera at a barcode - it will scan automatically" 
                : "Click Start Scanning to open the camera"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera preview container */}
            <div className={`${scanning ? "block" : "hidden"}`}>
              <div
                id="reader"
                className="w-full min-h-[400px] rounded-lg overflow-hidden border-2 border-primary bg-black"
              />
            </div>

            {/* Instruction when not scanning */}
            {!scanning && !loading && !productInfo && (
              <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Scan className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  Start scanning to use your camera for barcode detection
                </p>
              </div>
            )}

            <div className="flex gap-4">
              {!scanning ? (
                <Button onClick={startScanning} className="w-full" size="lg">
                  <Scan className="mr-2 h-5 w-5" />
                  Start Camera Scanner
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="w-full" size="lg">
                  <X className="mr-2 h-5 w-5" />
                  Stop Camera
                </Button>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Processing barcode...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Waste Detection</CardTitle>
            <CardDescription>
              Upload or capture a photo to identify waste type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleCameraCapture} 
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
              
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        {productInfo && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{productInfo.name}</h3>
                {productInfo.barcode && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Barcode: {productInfo.barcode}
                  </p>
                )}
                {productInfo.confidence && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Confidence: {productInfo.confidence}%
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{productInfo.description}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{productInfo.category}</Badge>
                <Badge
                  variant={
                    productInfo.recyclability.includes("Recyclable")
                      ? "default"
                      : "destructive"
                  }
                >
                  {productInfo.recyclability}
                </Badge>
              </div>

              <Button
                onClick={() => setProductInfo(null)}
                variant="outline"
                className="w-full"
              >
                Scan Another Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BarcodeScanner;
