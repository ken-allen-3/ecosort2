import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

const AnalysisLoading = () => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    "Analyzing your item...",
    "Identifying materials...",
    "Checking local rules...",
    "Preparing results...",
  ];

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 300);

    // Message rotation
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full p-6 sm:p-8 space-y-4 sm:space-y-6 animate-scale-in">
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-28 h-28 sm:w-32 sm:h-32 text-primary/20 animate-spin" style={{ animationDuration: '2s' }} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold animate-pulse">
            {messages[messageIndex]}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            This usually takes a few seconds
          </p>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {progress}% complete
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AnalysisLoading;
