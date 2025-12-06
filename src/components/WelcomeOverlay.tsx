import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, MapPin, Sparkles, ArrowRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LocationInput from "@/components/LocationInput";

interface WelcomeOverlayProps {
  onComplete: (location: string) => void;
}

const WelcomeOverlay = ({ onComplete }: WelcomeOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("ecosort-welcome-seen");
    const savedLocation = localStorage.getItem("ecosort-location");
    
    if (!hasSeenWelcome) {
      setIsVisible(true);
    } else if (savedLocation) {
      // User already completed onboarding, pass saved location
      onComplete(savedLocation);
    }
  }, [onComplete]);

  const tryIPBasedLocation = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ip-geolocation');
      
      if (error || !data?.city) {
        throw new Error("IP-based location failed");
      }

      setLocation(data.city);
      toast({
        title: "Location detected",
        description: `Found ${data.city} (approximate location)`,
      });
      return true;
    } catch (error) {
      console.error("IP-based location failed:", error);
      return false;
    }
  };

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setIsDetectingLocation(true);
      const success = await tryIPBasedLocation();
      setIsDetectingLocation(false);
      
      if (!success) {
        toast({
          title: "Location detection failed",
          description: "Please enter your city manually",
          variant: "destructive",
        });
      }
      return;
    }

    setIsDetectingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Location detection timed out"));
        }, 10000);

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

      const { data, error: geocodeError } = await supabase.functions.invoke('reverse-geocode', {
        body: { 
          latitude: position.coords.latitude, 
          longitude: position.coords.longitude 
        }
      });
      
      if (geocodeError || !data) {
        throw new Error("Failed to get city name");
      }
      
      const city = data.address?.city || data.address?.town || data.address?.village || "";
      
      if (!city) {
        throw new Error("Could not determine city name");
      }

      setLocation(city);
      toast({
        title: "Location detected",
        description: `Found ${city}`,
      });
    } catch (error) {
      const success = await tryIPBasedLocation();
      
      if (!success) {
        toast({
          title: "Location detection failed",
          description: "Please enter your city manually",
          variant: "destructive",
        });
      }
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toast]);

  const handleComplete = () => {
    if (!location.trim()) {
      toast({
        title: "Location required",
        description: "Please enter your city to continue",
        variant: "destructive",
      });
      return;
    }
    
    localStorage.setItem("ecosort-welcome-seen", "true");
    localStorage.setItem("ecosort-location", location.trim());
    setIsVisible(false);
    onComplete(location.trim());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full p-6 sm:p-8 space-y-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 1 && (
          <>
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Welcome to EcoSort</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Point your camera at any item to learn how to dispose of it properly
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">Location-aware rules</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Get disposal guidance specific to your city
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">Snap & classify</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Take a photo of any item for instant analysis
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">AI-powered insights</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Ask follow-up questions about any result
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep(2)} className="w-full min-h-[48px]" size="lg">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <button
              onClick={() => setStep(1)}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>

            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Set Your Location</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                We'll use this to give you accurate local recycling rules
              </p>
            </div>

            <div className="space-y-4">
              <LocationInput
                location={location}
                setLocation={setLocation}
                isDetectingLocation={isDetectingLocation}
                detectLocation={detectLocation}
              />

              <p className="text-xs text-muted-foreground text-center">
                You can change this later in settings
              </p>
            </div>

            <Button 
              onClick={handleComplete} 
              className="w-full min-h-[48px]" 
              size="lg"
              disabled={!location.trim()}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default WelcomeOverlay;
