import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ResultModal from "@/components/ResultModal";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import ExampleImages from "@/components/ExampleImages";
import AnalysisLoading from "@/components/AnalysisLoading";
import QuizMode from "@/components/QuizMode";
import QuizResult from "@/components/QuizResult";
import QuizSettings from "@/components/QuizSettings";
import LocationInput from "@/components/LocationInput";
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
        title: "Your browser is being difficult",
        description: `Some stuff might not work. Maybe update your browser? Issues: ${compat.issues.join(', ')}`,
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
        title: "What ancient browser is this?",
        description: "Your browser can't read files. Time for an upgrade, friend.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "That's not a damn picture",
        description: "Give me an actual image file (JPG, PNG, etc.)",
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
        title: "Holy hell, that's huge",
        description: "Keep it under 10MB, will ya?",
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
        title: "Well, shit",
        description: "Couldn't read that file. Try again?",
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
        title: "Where the hell are you?",
        description: "Set your location first so I can tell you the local rules",
        variant: "destructive",
      });
      return;
    }

    setResult({
      category: item.category,
      item: item.name,
      confidence: 95,
      explanation: item.description,
      disclaimer: `Rules vary by city. Double-check with ${location}'s waste management if you want to be a recycling hero.`,
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
        description: `Alright, using ${trimmed}'s weird-ass rules now`,
      });
    }
    setIsEditingLocation(false);
  };

  const analyzeImage = async () => {
    if (!image) {
      toast({
        title: "No picture, genius",
        description: "Take a photo first before I can tell you where it goes",
        variant: "destructive",
      });
      return;
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      toast({
        title: "Location, please!",
        description: "I need to know where you are to give you accurate rules",
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
          title: "Still working on it...",
          description: "This is taking longer than usual. Hang tight.",
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
          throw new Error("Whoa there, slow down! Try again in a sec.");
        }
        if (error.message?.includes("402") || error.message?.includes("payment")) {
          throw new Error("Service is having a moment. Try again later.");
        }
        
        throw new Error(error.message || "Something broke. Not my fault. Probably.");
      }

      if (!data) {
        throw new Error("Got nothing back. The void has claimed your request.");
      }

      if (!data.category || !data.item) {
        console.error("Invalid response structure:", data);
        throw new Error("Got a weird response. Let's try that again.");
      }

      if (!["recyclable", "compostable", "trash"].includes(data.category)) {
        console.error("Invalid category:", data.category);
        throw new Error("AI gave me a category I don't understand. Classic.");
      }

      console.log("Classification successful:", data);
      setResult(data);
      
      toast({
        title: "Got it!",
        description: `That goes in the ${data.category} bin`,
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error("Classification error:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Couldn't figure out what that is. Try again?";
      
      toast({
        title: "Damn it",
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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Which Fucking Bin?</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Because recycling shouldn't be this hard</p>
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
                <LocationInput
                  location={editedLocation}
                  setLocation={setEditedLocation}
                  showDetectButton={false}
                  showStatusText={false}
                  placeholder="Enter city"
                  inputClassName="h-8 w-48 text-sm"
                  onEnter={handleLocationSave}
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
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">What the hell is it?</h2>
                  <p className="text-muted-foreground text-sm">
                    Snap a pic of your mystery trash and I'll tell you where it goes
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
                  Scan This Crap
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
                    Nope, Retake
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
                        Figuring it out...
                      </>
                    ) : quizEnabled ? (
                      "Test Me First"
                    ) : (
                      "Where Does It Go?"
                    )}
                  </Button>
                </div>
                {!location && (
                  <p className="text-sm text-destructive text-center">
                    Set your location first, ya dingus
                  </p>
                )}
              </div>
            )}
          </div>
          </Card>
        )}

        {!result && (
          <div className="text-center text-xs sm:text-sm text-muted-foreground px-4">
            <p>Let's stop throwing recyclables in the damn trash</p>
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