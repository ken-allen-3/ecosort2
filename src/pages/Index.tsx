import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ResultModal from "@/components/ResultModal";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import ExampleImages from "@/components/ExampleImages";
import AnalysisLoading from "@/components/AnalysisLoading";
import QuizMode from "@/components/QuizMode";
import QuizResult from "@/components/QuizResult";
import QuizSettings from "@/components/QuizSettings";
import { checkBrowserCompatibility, getBrowserInfo } from "@/lib/browserCompat";

interface ClassificationResult {
  category: "recyclable" | "compostable" | "trash";
  item: string;
  confidence: number;
  explanation: string;
  municipalNotes?: string;
  disclaimer?: string;
}

const Index = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [location, setLocation] = useState<string>(() => {
    return localStorage.getItem("ecosort-location") || "";
  });
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocation, setEditedLocation] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [userGuess, setUserGuess] = useState<"recyclable" | "compostable" | "trash" | null>(null);
  const [quizEnabled, setQuizEnabled] = useState(() => {
    const saved = localStorage.getItem("ecosort-quiz-enabled");
    return saved ? JSON.parse(saved) : false;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleOnboardingComplete = (newLocation: string) => {
    setLocation(newLocation);
  };

  // Check browser compatibility on mount
  useEffect(() => {
    const compat = checkBrowserCompatibility();
    const browserInfo = getBrowserInfo();
    
    console.log('Browser info:', browserInfo);
    console.log('Browser compatibility:', compat);
    
    if (!compat.isCompatible) {
      toast({
        title: "Browser compatibility issue",
        description: `Some features may not work properly. Please update your browser. Issues: ${compat.issues.join(', ')}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Save quiz enabled preference
  useEffect(() => {
    localStorage.setItem("ecosort-quiz-enabled", JSON.stringify(quizEnabled));
  }, [quizEnabled]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.FileReader) {
      toast({
        title: "Browser not supported",
        description: "Your browser doesn't support file reading. Please update your browser.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
      setUserGuess(null);
      
      if (quizEnabled && location) {
        setShowQuiz(true);
      }
      
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
      disclaimer: `Rules may vary. Please verify with ${location}'s official waste management resources.`,
    });
  };

  const handleQuizComplete = (guess: "recyclable" | "compostable" | "trash") => {
    setUserGuess(guess);
    setShowQuiz(false);
    analyzeImage();
  };

  const handleQuizSkip = () => {
    setShowQuiz(false);
    setUserGuess(null);
  };

  const handleLocationEdit = () => {
    setEditedLocation(location);
    setIsEditingLocation(true);
  };

  const handleLocationSave = () => {
    const trimmed = editedLocation.trim();
    if (trimmed) {
      setLocation(trimmed);
      localStorage.setItem("ecosort-location", trimmed);
      toast({
        title: "Location updated",
        description: `Now using rules for ${trimmed}`,
      });
    }
    setIsEditingLocation(false);
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
    }, 15000);
    
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

      if (!data.category || !data.item) {
        console.error("Invalid response structure:", data);
        throw new Error("Invalid response from classification service");
      }

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
      <WelcomeOverlay onComplete={handleOnboardingComplete} />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">EcoSort</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Smart waste classification</p>
          </div>
          <QuizSettings quizEnabled={quizEnabled} onToggle={setQuizEnabled} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Compact location display */}
        {location && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {isEditingLocation ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedLocation}
                  onChange={(e) => setEditedLocation(e.target.value.slice(0, 100))}
                  className="h-8 w-48 text-sm"
                  maxLength={100}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLocationSave();
                    if (e.key === 'Escape') setIsEditingLocation(false);
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleLocationSave} className="h-8">
                  Save
                </Button>
              </div>
            ) : (
              <>
                <span>{location}</span>
                <button
                  onClick={handleLocationEdit}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Change location"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        )}

        {!image && !result && <ExampleImages onExampleClick={handleExampleClick} />}

        {showQuiz && image && location ? (
          <Card className="p-4 sm:p-6">
            <QuizMode
              image={image}
              onComplete={handleQuizComplete}
              onSkip={handleQuizSkip}
            />
          </Card>
        ) : (
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
                  accept="image/*,image/jpeg,image/jpg,image/png,image/webp,image/heic"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                  aria-label="Capture or upload image"
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
                    onClick={() => {
                      if (quizEnabled && location) {
                        setShowQuiz(true);
                      } else {
                        analyzeImage();
                      }
                    }}
                    disabled={isAnalyzing || !location}
                    className="flex-1 min-h-[48px]"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : quizEnabled ? (
                      "Start Quiz"
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
        )}

        {!result && (
          <div className="text-center text-xs sm:text-sm text-muted-foreground px-4">
            <p>Help reduce contamination in recycling and composting streams</p>
          </div>
        )}
      </main>

      {isAnalyzing && <AnalysisLoading />}

      {userGuess && result && !isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <QuizResult
              userGuess={userGuess}
              correctAnswer={result.category}
              onContinue={() => setUserGuess(null)}
            />
          </div>
        </div>
      )}

      {result && !userGuess && (
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
