import { useState, useRef, useCallback } from "react";
import { Camera, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ResultModal from "@/components/ResultModal";
import LocationInput from "@/components/LocationInput";
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
    console.log("🔍 Location detection started");
    console.log("📍 Protocol:", window.location.protocol);
    console.log("📍 Is HTTPS:", window.location.protocol === 'https:');
    
    if (!navigator.geolocation) {
      console.error("❌ Geolocation API not available");
      toast({
        title: "Geolocation not supported",
        description: "Please enter your location manually",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ Geolocation API available");
    setIsDetectingLocation(true);
    
    try {
      console.log("📍 Requesting position from browser...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error("❌ Position request timed out after 10s");
          reject(new Error("Location detection timed out"));
        }, 10000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeout);
            console.log("✅ Position received:", {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            });
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeout);
            console.error("❌ Geolocation error:", {
              code: err.code,
              message: err.message,
              PERMISSION_DENIED: err.code === 1,
              POSITION_UNAVAILABLE: err.code === 2,
              TIMEOUT: err.code === 3
            });
            reject(err);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      });

      console.log("📍 Fetching city name via backend...");
      
      const { data, error: geocodeError } = await supabase.functions.invoke('reverse-geocode', {
        body: { 
          latitude: position.coords.latitude, 
          longitude: position.coords.longitude 
        }
      });
      
      console.log("📍 Backend response:", data);
      
      if (geocodeError) {
        console.error("❌ Reverse geocode error:", geocodeError);
        throw new Error(`Failed to fetch location data: ${geocodeError.message}`);
      }
      
      if (!data) {
        throw new Error('No data received from reverse geocode');
      }
      
      const city = data.address?.city || data.address?.town || data.address?.village || "";
      console.log("📍 Extracted city:", city);
      
      if (!city) {
        console.error("❌ Could not extract city from response");
        throw new Error("Could not determine city name");
      }

      setLocation(city);
      console.log("✅ Location set successfully:", city);
      
      toast({
        title: "Location detected",
        description: `Set to ${city}`,
      });
    } catch (error) {
      console.error("❌ Location detection error:", error);
      
      let errorMessage = "Location detection failed. Please enter your location manually.";
      let errorDetails = "";
      
      if (error instanceof GeolocationPositionError) {
        console.log("📍 GeolocationPositionError details:", {
          code: error.code,
          message: error.message
        });
        
        if (error.code === 1) {
          errorMessage = "Location permission denied. Please enter your location manually.";
          errorDetails = "User denied permission or browser blocked access";
        } else if (error.code === 2) {
          errorMessage = "Unable to detect location. Please enter your location manually.";
          errorDetails = "Position unavailable";
        } else if (error.code === 3) {
          errorMessage = "Location detection timed out. Please enter your location manually.";
          errorDetails = "Timeout";
        }
      } else if (error instanceof Error) {
        errorDetails = error.message;
      }
      
      console.log("📍 Error summary:", { errorMessage, errorDetails });
      
      toast({
        title: "Location detection failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDetectingLocation(false);
      console.log("🔍 Location detection completed");
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
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">EcoSort</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Smart waste classification</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <Card className="p-4 sm:p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Your Location</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Set your location for accurate local rules
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

        <Card className="p-4 sm:p-6">
          <div className="space-y-4">
            {!image ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">Ready to scan</h2>
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
                  className="w-full sm:w-auto min-h-[48px]"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Take Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden max-h-[60vh]">
                  <img 
                    src={image} 
                    alt="Captured item" 
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImage(null);
                      setResult(null);
                    }}
                    className="flex-1 min-h-[48px]"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={analyzeImage}
                    disabled={isAnalyzing || !location}
                    className="flex-1 min-h-[48px]"
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
          <div className="text-center text-xs sm:text-sm text-muted-foreground px-4">
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
