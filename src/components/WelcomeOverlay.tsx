import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, MapPin, Sparkles, ArrowRight, ChevronLeft, Trash2 } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryIPBasedLocation = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ip-geolocation');
      
      if (error || !data?.city) {
        throw new Error("IP-based location failed");
      }

      setLocation(data.city);
      toast({
        title: "Found ya! 📍",
        description: `Looks like you're in ${data.city} (close enough)`,
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
          title: "Can't find you 🤷",
          description: "Just type in your city, it's fine",
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
        title: "Got it! 📍",
        description: `You're in ${city}`,
      });
    } catch (error) {
      const success = await tryIPBasedLocation();
      
      if (!success) {
        toast({
          title: "Location's being difficult 😤",
          description: "Just type your city in manually",
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
        title: "C'mon, where are you? 📍",
        description: "I need your city to give you the right rules",
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
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full p-6 sm:p-8 space-y-6 animate-bounce-in max-h-[90vh] overflow-y-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-sm transition-colors border-2 ${step >= 1 ? 'bg-primary border-primary' : 'bg-muted border-border'}`} />
          <div className={`w-3 h-3 rounded-sm transition-colors border-2 ${step >= 2 ? 'bg-primary border-primary' : 'bg-muted border-border'}`} />
        </div>

        {step === 1 && (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-lg bg-primary/20 border-2 border-primary/30 flex items-center justify-center animate-wiggle">
              <Trash2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="font-display text-3xl sm:text-4xl tracking-wide">Which Fucking Bin?</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Finally. An app that tells you where your crap goes. 🗑️
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm sm:text-base">Every city has different rules 🙄</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Because apparently that makes sense
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm sm:text-base">Snap a pic, get the answer 📸</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No more googling "can I recycle pizza box"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm sm:text-base">AI that gets it 🤖</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Ask follow-up questions when shit gets confusing
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep(2)} className="w-full min-h-[48px] text-base" size="lg">
              Let's Do This 💪
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

            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-lg bg-primary/20 border-2 border-primary/30 flex items-center justify-center animate-wiggle">
              <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="font-display text-3xl sm:text-4xl tracking-wide">Where Are You? 📍</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                So I can look up your city's ridiculous recycling rules
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
                You can change this later if you move or whatever 🏠
              </p>
            </div>

            <Button 
              onClick={handleComplete} 
              className="w-full min-h-[48px] text-base" 
              size="lg"
              disabled={!location.trim()}
            >
              Let's Sort Some Trash 🗑️
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default WelcomeOverlay;