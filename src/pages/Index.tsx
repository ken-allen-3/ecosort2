import { useState, useRef, useCallback } from "react";
import { Camera, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ResultModal from "@/components/ResultModal";
import LocationInput from "@/components/LocationInput";
import AnalysisDebugger from "@/components/AnalysisDebugger";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import ExampleImages from "@/components/ExampleImages";
import AnalysisLoading from "@/components/AnalysisLoading";

interface ClassificationResult {
  category: "recyclable" | "compostable" | "trash";
  item: string;
  confidence: number;
  explanation: string;
  municipalNotes?: string;
}

const Index = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [location, setLocation] = useState<string>("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Please enter your location manually",
        variant: "destructive",
      });
      return;
    }

    setIsDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Location detection timed out"));
        }, 10000); // 10 second timeout

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeout);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeout);
            reject(err);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch location data");
      }

      const data = await response.json();
      const city = data.address?.city || data.address?.town || data.address?.village || "";
      
      if (!city) {
        throw new Error("Could not determine city name");
      }

      setLocation(city);
      toast({
        title: "Location detected",
        description: `Set to ${city}`,
      });
    } catch (error) {
      console.error("Location detection error:", error);
      const errorMessage = error instanceof GeolocationPositionError
        ? error.code === 1
          ? "Location permission denied. Please enter your location manually."
          : "Unable to detect location. Please enter your location manually."
        : "Location detection failed. Please enter your location manually.";
      
      toast({
        title: "Location detection failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toast]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      // Reset input so user can try again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      // Reset input so user can try again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
      toast({
        title: "Failed to read file",
        description: "Please try selecting the image again",
        variant: "destructive",
      });
      // Reset input so user can try again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleExampleClick = (item: any) => {
    if (!location) {
      toast({
        title: "Location required",
        description: "Please set your location first to see local disposal rules",
        variant: "destructive",
      });
      return;
    }

    setResult({
      category: item.category,
      item: item.name,
      confidence: 95,
      explanation: item.description,
      municipalNotes: `Based on ${location}'s waste management rules.`,
    });
  };

  const analyzeImage = async () => {
    if (!image) {
      toast({
        title: "No image",
        description: "Please take or upload a photo first",
        variant: "destructive",
      });
      return;
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      toast({
        title: "Location required",
        description: "Please set your location before analyzing",
        variant: "destructive",
      });
      return;
    }

    // Prevent double submission
    if (isAnalyzing) {
      return;
    }
    
    setIsAnalyzing(true);
    setResult(null);
    
    const timeout = setTimeout(() => {
      if (isAnalyzing) {
        toast({
          title: "Taking longer than expected",
          description: "Still analyzing, please wait...",
        });
      }
    }, 15000); // Show message if it takes more than 15 seconds
    
    try {
      console.log("Starting image analysis for location:", trimmedLocation);
      console.log("Image data length:", image.length);
      
      const { data, error } = await supabase.functions.invoke("classify-item", {
        body: { 
          image: image,
          location: trimmedLocation.toLowerCase()
        },
      });

      clearTimeout(timeout);
      console.log("Edge function response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        
        // Handle specific error types
        if (error.message?.includes("429") || error.message?.includes("rate limit")) {
          throw new Error("Service is busy. Please try again in a moment.");
        }
        if (error.message?.includes("402") || error.message?.includes("payment")) {
          throw new Error("Service temporarily unavailable. Please try again later.");
        }
        
        throw new Error(error.message || "Classification service error");
      }

      if (!data) {
        throw new Error("No response from classification service");
      }

      // Validate response structure
      if (!data.category || !data.item) {
        console.error("Invalid response structure:", data);
        throw new Error("Invalid response from classification service");
      }

      // Validate category
      if (!["recyclable", "compostable", "trash"].includes(data.category)) {
        console.error("Invalid category:", data.category);
        throw new Error("Invalid classification category received");
      }

      console.log("Classification successful:", data);
      setResult(data);
      
      toast({
        title: "Analysis complete",
        description: `Item classified as ${data.category}`,
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error("Classification error:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Could not classify the item. Please try again.";
      
      toast({
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <WelcomeOverlay />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">EcoSort</h1>
          <p className="text-sm text-muted-foreground">Smart waste classification</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <AnalysisDebugger 
          image={image}
          location={location}
          isAnalyzing={isAnalyzing}
        />
        
        <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Your Location</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Set your location to get accurate local disposal rules
              </p>
              <LocationInput
                location={location}
                setLocation={setLocation}
                isDetectingLocation={isDetectingLocation}
                detectLocation={detectLocation}
              />
            </div>
          </div>
        </Card>

        {!image && !result && <ExampleImages onExampleClick={handleExampleClick} />}

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            {!image ? (
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Ready to scan</h2>
                  <p className="text-muted-foreground text-sm">
                    Point your camera at any item to get instant disposal guidance
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                />
                <Button
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Take Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden">
                  <img src={image} alt="Captured item" className="w-full h-auto" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImage(null);
                      setResult(null);
                    }}
                    className="flex-1"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={analyzeImage}
                    disabled={isAnalyzing || !location}
                    className="flex-1"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </div>
                {!location && (
                  <p className="text-sm text-destructive text-center">
                    Please set your location before analyzing
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {!result && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Help reduce contamination in recycling and composting streams</p>
          </div>
        )}
      </main>

      {isAnalyzing && <AnalysisLoading />}

      {result && (
        <ResultModal
          result={result}
          location={location}
          onClose={() => {
            setResult(null);
            setImage(null);
          }}
        />
      )}
    </div>
  );
};

export default Index;
