import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, MapPin, Sparkles } from "lucide-react";

const WelcomeOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("ecosort-welcome-seen");
    if (!hasSeenWelcome) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("ecosort-welcome-seen", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md p-8 space-y-6 animate-scale-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Welcome to EcoSort</h2>
          <p className="text-muted-foreground">
            Point your camera at any item to learn how to dispose of it properly
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Set your location</p>
              <p className="text-sm text-muted-foreground">
                Get disposal rules specific to your city
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Take a photo</p>
              <p className="text-sm text-muted-foreground">
                Capture any item you want to classify
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Get instant guidance</p>
              <p className="text-sm text-muted-foreground">
                Learn if it's recyclable, compostable, or trash
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full" size="lg">
          Get Started
        </Button>
      </Card>
    </div>
  );
};

export default WelcomeOverlay;
