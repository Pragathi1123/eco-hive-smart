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
import recyclableImage from "@/assets/recyclable-waste.png";
import compostableImage from "@/assets/compostable-waste.png";
import ewasteImage from "@/assets/ewaste.png";

interface ProductInfo {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  barcode?: string;
  confidence?: number;
  correctAnswer?: string;
}

const BarcodeScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateScanningImage = async () => {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: "A photorealistic image showing waste segregation bins with recyclable, compostable, and e-waste categories, modern clean design with green and blue colors, sustainability theme, ultra high resolution, 16:9 aspect ratio"
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        setGeneratedImage(imageUrl);
      }
    } catch (error) {
      console.error("Failed to generate scanning image:", error);
    }
  };

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
      
      // Generate AI image for scanning context
      generateScanningImage();

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

  const generateWasteImage = async (category: string) => {
    try {
      const prompts = {
        "Recyclable": "A photorealistic image of clean recyclable waste items including plastic bottles, aluminum cans, paper, and cardboard in a recycling bin, bright and organized, ultra high resolution, 16:9 aspect ratio",
        "Compostable": "A photorealistic image of organic compostable waste including fruit peels, vegetable scraps, and food waste in a compost bin, natural earthy colors, ultra high resolution, 16:9 aspect ratio",
        "E-Waste": "A photorealistic image of electronic waste items including old phones, circuit boards, and electronic devices ready for proper disposal, tech aesthetic, ultra high resolution, 16:9 aspect ratio"
      };

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: prompts[category as keyof typeof prompts] || prompts["E-Waste"]
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        setGeneratedImage(imageUrl);
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    }
  };

  const fetchProductInfo = async (barcode: string) => {
    try {
      // Try Open Food Facts API first
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const category = determineCategory(product);
        setProductInfo({
          name: product.product_name || "Unknown Product",
          description: product.generic_name || product.categories || "No description available",
          category: category,
          subcategory: product.categories_tags?.[0]?.replace("en:", "") || "Unknown",
          barcode: barcode,
          correctAnswer: category,
        });
        await generateWasteImage(category);
      } else {
        // Fallback for electronics/unknown items
        setProductInfo({
          name: "Electronic Item",
          description: "Electronic waste item detected. Please dispose of properly at designated e-waste collection points.",
          category: "E-Waste",
          subcategory: "Electronic Device",
          barcode: barcode,
          correctAnswer: "E-Waste",
        });
        await generateWasteImage("E-Waste");
      }
      toast.success("Product scanned successfully!");
    } catch (error) {
      toast.error("Failed to fetch product information");
      setProductInfo({
        name: "Unknown Item",
        description: "Could not retrieve product information. Barcode: " + barcode,
        category: "E-Waste",
        subcategory: "Unknown",
        barcode: barcode,
        correctAnswer: "E-Waste",
      });
      await generateWasteImage("E-Waste");
    } finally {
      setLoading(false);
    }
  };

  const determineCategory = (product: any): string => {
    const packaging = product.packaging_tags || [];
    const categories = product.categories_tags || [];
    
    // Check if it's food/organic
    if (categories.some((c: string) => c.includes("food") || c.includes("organic"))) {
      return "Compostable";
    }
    
    // Check if recyclable packaging
    if (packaging.some((p: string) => p.includes("recyclable") || p.includes("plastic") || p.includes("paper") || p.includes("metal") || p.includes("glass"))) {
      return "Recyclable";
    }
    
    return "E-Waste";
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
        setUploadedImage(base64String); // Store the uploaded image
        
        // Call edge function for waste detection
        const { data, error } = await supabase.functions.invoke("detect-waste", {
          body: { imageBase64: base64String },
        });

        if (error) {
          throw error;
        }

        setProductInfo({
          name: data.subcategory || data.category,
          description: data.description,
          category: data.category,
          subcategory: data.subcategory,
          confidence: data.confidence,
          correctAnswer: data.correctAnswer,
        });
        
        toast.success("Image analyzed successfully!");
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error("Failed to analyze image. Please try again.");
      setUploadedImage(null);
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

  const handleConfirmClassification = async (confirmedCategory: string) => {
    if (!productInfo) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to track your accuracy");
        return;
      }

      const isCorrect = confirmedCategory === productInfo.correctAnswer;

      const { error } = await supabase.from("classification_logs").insert({
        user_id: user.id,
        item_name: productInfo.name,
        detected_category: productInfo.category,
        user_confirmed_category: confirmedCategory,
        is_correct: isCorrect,
        confidence: productInfo.confidence,
        barcode: productInfo.barcode,
      });

      if (error) throw error;

      if (isCorrect) {
        toast.success("Correct! +10 points for accurate classification");
      } else {
        toast.error(`Incorrect. The correct category was ${productInfo.correctAnswer}`);
      }

      setProductInfo(null);
      setUploadedImage(null);
      setGeneratedImage(null);
    } catch (error) {
      console.error("Error logging classification:", error);
      toast.error("Failed to log classification");
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

            {/* Show AI image when scanning */}
            {scanning && generatedImage && (
              <div className="flex justify-center mb-4">
                <img 
                  src={generatedImage}
                  alt="Waste segregation guide"
                  className="h-48 w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

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
              {/* Display uploaded image for photo uploads or generated image for barcode scans */}
              {(uploadedImage || generatedImage) && (
                <div className="flex justify-center">
                  <img 
                    src={uploadedImage || generatedImage || ""}
                    alt="Scanned item"
                    className="h-64 w-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}

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
                {productInfo.subcategory && (
                  <Badge variant="outline">{productInfo.subcategory}</Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Confirm Classification:</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => handleConfirmClassification("Recyclable")}
                    variant={productInfo.category === "Recyclable" ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    Recyclable
                  </Button>
                  <Button
                    onClick={() => handleConfirmClassification("Compostable")}
                    variant={productInfo.category === "Compostable" ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    Compostable
                  </Button>
                  <Button
                    onClick={() => handleConfirmClassification("E-Waste")}
                    variant={productInfo.category === "E-Waste" ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    E-Waste
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Confirm the correct category to earn accuracy points
                </p>
              </div>

              <Button
                onClick={() => {
                  setProductInfo(null);
                  setUploadedImage(null);
                  setGeneratedImage(null);
                }}
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
