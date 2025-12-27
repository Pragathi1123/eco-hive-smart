import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, X, Loader2, Upload, Camera } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
  insideWaste?: {
    type: string;
    classification: string;
  };
  packaging?: {
    material: string;
    disposal: string;
  };
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
      const { data, error } = await supabase.functions.invoke("generate-waste-image", {
        body: { 
          category: "Recyclable",
          productName: "Waste segregation bins",
          subcategory: "General"
        },
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
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

      // Prefer the back camera when available
      const devices = await Html5Qrcode.getCameras();
      let cameraIdOrConstraints: any = { facingMode: "environment" };
      if (devices && devices.length) {
        const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
        const chosen = backCam ?? devices[0];
        cameraIdOrConstraints = chosen.id;
      }

      // Wider rectangular box improves 1D barcode detection
      const viewportWidth = Math.min(window.innerWidth, 640);
      const qrboxWidth = Math.floor(viewportWidth * 0.9);
      const qrboxHeight = Math.floor(qrboxWidth * 0.4);

      await scanner.start(
        cameraIdOrConstraints,
        {
          fps: 10,
          qrbox: { width: qrboxWidth, height: qrboxHeight },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        } as any,
        async (decodedText) => {
          console.log("Barcode detected:", decodedText);
          setLoading(true);
          setUploadedImage(null); // Clear uploaded image for barcode scans
          await stopScanning();
          await fetchProductInfo(decodedText);
        },
        (errorMessage) => {
          // Frame where no code is detected
          // console.debug("Scan frame no match:", errorMessage);
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
    setGeneratedImage(null); // Clear scanning guide image
  };

  const generateWasteImage = async (category: string, productName?: string, subcategory?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-waste-image", {
        body: { category, productName, subcategory },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
    }
  };

  const fetchProductInfo = async (barcode: string) => {
    try {
      // Try Open Food Facts API first
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const name = product.product_name || product.brands || "Unknown Product";
        const subcat = product.categories_tags?.[0]?.replace("en:", "") || "Unknown";
        
        // Determine inside waste type based on product categories
        const insideWaste = determineInsideWaste(product);
        
        // Determine packaging material from Open Food Facts data
        const packaging = determinePackaging(product);
        
        // The packaging determines the overall disposal category
        const category = packaging.disposal;
        
        // Generate image for the detected category
        generateWasteImage(category, name, subcat);
        
        setProductInfo({
          name: name,
          description: product.generic_name || product.categories || "No description available",
          category: category,
          subcategory: subcat,
          barcode: barcode,
          correctAnswer: category,
          insideWaste: insideWaste,
          packaging: packaging,
        });
      } else {
        // Fallback for electronics/unknown items
        generateWasteImage("E-Waste", "Electronic Item", "Electronic Device");
        
        setProductInfo({
          name: "Electronic Item",
          description: "Electronic waste item detected. Please dispose of properly at designated e-waste collection points.",
          category: "E-Waste",
          subcategory: "Electronic Device",
          barcode: barcode,
          correctAnswer: "E-Waste",
          insideWaste: {
            type: "Electronic Components",
            classification: "Hazardous - E-Waste"
          },
          packaging: {
            material: "Cardboard/Plastic",
            disposal: "E-Waste"
          }
        });
      }
      toast.success("Product scanned successfully!");
    } catch (error) {
      toast.error("Failed to fetch product information");
      generateWasteImage("E-Waste", "Unknown Item", "Unknown");
      
      setProductInfo({
        name: "Unknown Item",
        description: "Could not retrieve product information. Barcode: " + barcode,
        category: "E-Waste",
        subcategory: "Unknown",
        barcode: barcode,
        correctAnswer: "E-Waste",
      });
    } finally {
      setLoading(false);
    }
  };

  const determineInsideWaste = (product: any): { type: string; classification: string } => {
    const categories = product.categories_tags || [];
    const categoryStr = categories.join(" ").toLowerCase();
    
    // Food items are biodegradable/compostable
    if (categoryStr.includes("snack") || categoryStr.includes("chip") || categoryStr.includes("crisp")) {
      return { type: "Food waste (chips/snacks)", classification: "Biodegradable - Compostable" };
    }
    if (categoryStr.includes("beverage") || categoryStr.includes("drink") || categoryStr.includes("juice")) {
      return { type: "Liquid residue", classification: "Pour out, rinse container" };
    }
    if (categoryStr.includes("food") || categoryStr.includes("meal") || categoryStr.includes("organic")) {
      return { type: "Food waste", classification: "Biodegradable - Compostable" };
    }
    if (categoryStr.includes("dairy") || categoryStr.includes("milk") || categoryStr.includes("yogurt")) {
      return { type: "Dairy product residue", classification: "Biodegradable - Compostable" };
    }
    if (categoryStr.includes("meat") || categoryStr.includes("fish") || categoryStr.includes("poultry")) {
      return { type: "Meat/protein waste", classification: "Biodegradable - Special disposal" };
    }
    if (categoryStr.includes("fruit") || categoryStr.includes("vegetable")) {
      return { type: "Produce waste", classification: "Biodegradable - Compostable" };
    }
    if (categoryStr.includes("candy") || categoryStr.includes("chocolate") || categoryStr.includes("sweet")) {
      return { type: "Confectionery waste", classification: "Biodegradable - Compostable" };
    }
    
    return { type: "Mixed/Unknown contents", classification: "Check product label" };
  };

  const determinePackaging = (product: any): { material: string; disposal: string } => {
    const packaging = product.packaging_tags || [];
    const packagingStr = packaging.join(" ").toLowerCase();
    const packagingText = product.packaging || "";
    const combined = (packagingStr + " " + packagingText).toLowerCase();
    
    // Plastic packaging
    if (combined.includes("plastic") || combined.includes("pp") || combined.includes("pet") || combined.includes("hdpe") || combined.includes("ldpe")) {
      if (combined.includes("wrapper") || combined.includes("film") || combined.includes("bag")) {
        return { material: "Plastic wrapper/film", disposal: "Recyclable" };
      }
      return { material: "Plastic container", disposal: "Recyclable" };
    }
    
    // Metal packaging
    if (combined.includes("aluminium") || combined.includes("aluminum") || combined.includes("can") || combined.includes("metal") || combined.includes("tin")) {
      return { material: "Metal/Aluminum can", disposal: "Recyclable" };
    }
    
    // Glass packaging
    if (combined.includes("glass") || combined.includes("bottle")) {
      return { material: "Glass bottle/jar", disposal: "Recyclable" };
    }
    
    // Paper/Cardboard packaging
    if (combined.includes("cardboard") || combined.includes("paper") || combined.includes("carton")) {
      return { material: "Paper/Cardboard", disposal: "Recyclable" };
    }
    
    // Tetra pak / composite
    if (combined.includes("tetra") || combined.includes("composite")) {
      return { material: "Tetra Pak/Composite", disposal: "Recyclable" };
    }
    
    return { material: "Mixed/Unknown material", disposal: "Recyclable" };
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
              {/* Side-by-side layout for image and information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image section */}
                {(uploadedImage || generatedImage) && (
                  <div className="flex justify-center items-start">
                    <img 
                      src={uploadedImage || generatedImage || ""}
                      alt="Scanned item"
                      className="w-full h-64 object-contain rounded-lg shadow-lg"
                    />
                  </div>
                )}

                {/* Information section */}
                <div className="space-y-4">
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

                  {/* Inside Waste Type */}
                  {productInfo.insideWaste && (
                    <div className="p-3 rounded-lg bg-accent/50 border border-accent">
                      <p className="text-sm font-medium mb-1 flex items-center gap-2">
                        <span className="text-lg">🍃</span> Inside Waste
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {productInfo.insideWaste.type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {productInfo.insideWaste.classification}
                      </p>
                    </div>
                  )}

                  {/* Packaging Material */}
                  {productInfo.packaging && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium mb-1 flex items-center gap-2">
                        <span className="text-lg">📦</span> Packaging
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {productInfo.packaging.material}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Disposal: {productInfo.packaging.disposal}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{productInfo.category}</Badge>
                    {productInfo.subcategory && (
                      <Badge variant="outline">{productInfo.subcategory}</Badge>
                    )}
                  </div>
                </div>
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
