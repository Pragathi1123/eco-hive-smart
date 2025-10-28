import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, X, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

interface ProductInfo {
  name: string;
  description: string;
  recyclability: string;
  category: string;
  barcode: string;
}

const BarcodeScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          setLoading(true);
          await stopScanning();
          await fetchProductInfo(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      toast.error("Failed to access camera. Please grant camera permissions.");
      console.error(err);
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
            <CardTitle>Scanner</CardTitle>
            <CardDescription>
              Point your camera at a product barcode to scan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              id="reader"
              className={`w-full ${scanning ? "block" : "hidden"} rounded-lg overflow-hidden`}
            />

            <div className="flex gap-4">
              {!scanning ? (
                <Button onClick={startScanning} className="w-full">
                  <Scan className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="w-full">
                  <X className="mr-2 h-4 w-4" />
                  Stop Scanning
                </Button>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
        </Card>

        {productInfo && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{productInfo.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Barcode: {productInfo.barcode}
                </p>
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
