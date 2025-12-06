import { useState } from "react";
import { Recycle, Leaf, Trash2, X, MapPin, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AskQuestion from "./AskQuestion";

interface ResultModalProps {
  result: {
    category: "recyclable" | "compostable" | "trash";
    item: string;
    confidence: number;
    explanation: string;
    municipalNotes?: string;
  };
  location: string;
  onClose: () => void;
}

const ResultModal = ({ result, location, onClose }: ResultModalProps) => {
  const [copied, setCopied] = useState(false);

  const getCategoryConfig = () => {
    switch (result.category) {
      case "recyclable":
        return {
          icon: Recycle,
          color: "text-recyclable",
          bgColor: "bg-recyclable/20",
          borderColor: "border-recyclable",
          title: "Recycling Bin",
          subtitle: "Toss it in the blue one",
          emoji: "♻️",
        };
      case "compostable":
        return {
          icon: Leaf,
          color: "text-compostable",
          bgColor: "bg-compostable/20",
          borderColor: "border-compostable",
          title: "Compost Bin",
          subtitle: "Let it rot with dignity",
          emoji: "🌱",
        };
      case "trash":
        return {
          icon: Trash2,
          color: "text-trash",
          bgColor: "bg-trash/20",
          borderColor: "border-trash",
          title: "Trash Bin",
          subtitle: "Into the landfill it goes",
          emoji: "🗑️",
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;

  const getShareText = () => {
    const binName = result.category === "recyclable" ? "recycling" : result.category === "compostable" ? "compost" : "trash";
    const phrases = [
      `Finally figured out where my ${result.item} goes: the fucking ${binName} bin ${config.emoji}`,
      `Plot twist: ${result.item} goes in ${binName} ${config.emoji} Who knew?`,
      `Asked "Which Fucking Bin?" and learned my ${result.item} belongs in ${binName} ${config.emoji}`,
      `TIL my ${result.item} goes in the ${binName} bin. Thanks, Which Fucking Bin? ${config.emoji}`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const handleShare = async () => {
    const shareText = getShareText();
    
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Which Fucking Bin?",
          text: shareText,
          url: window.location.origin,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name === "AbortError") return;
      }
    }
    
    // Fall back to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${window.location.origin}`);
      setCopied(true);
      toast.success("Copied to clipboard! Now go paste it somewhere.");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Couldn't copy. Your browser's being difficult.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
            <h2 className="font-display text-xl sm:text-2xl tracking-wide">The Verdict</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px]">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl space-y-4 sm:space-y-6">
            {/* Category Badge */}
            <Card className={`p-8 text-center border-3 ${config.borderColor} ${config.bgColor} animate-bounce-in`}>
              <div className={`w-24 h-24 mx-auto rounded-lg ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center mb-4 animate-wiggle`}>
                <Icon className={`w-12 h-12 ${config.color}`} />
              </div>
              <h3 className="font-display text-4xl sm:text-5xl mb-2 tracking-wide">{config.title} {config.emoji}</h3>
              <p className="text-lg text-muted-foreground mb-1">{config.subtitle}</p>
              <p className="text-xl text-foreground font-bold mb-2">{result.item}</p>
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-full border border-border">
                <span className="font-medium">
                  {result.confidence > 1 ? result.confidence : (result.confidence * 100).toFixed(0)}% sure about this
                </span>
              </div>
            </Card>

            {/* Explanation */}
            <Card className="p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h4 className="font-display text-xl mb-3 flex items-center gap-2 tracking-wide">
                <div className={`w-3 h-3 rounded-sm ${config.bgColor} border ${config.borderColor}`}></div>
                Why? Here's the Deal:
              </h4>
              <p className="text-muted-foreground leading-relaxed">{result.explanation}</p>
            </Card>

            {/* Municipal Notes */}
            {result.municipalNotes && (
              <Card className="p-6 bg-primary/10 border-primary/30 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <h4 className="font-display text-xl mb-3 flex items-center gap-2 tracking-wide">
                  <MapPin className="w-5 h-5 text-primary" />
                  {location}'s Special Rules 🙄
                </h4>
                <p className="text-muted-foreground leading-relaxed">{result.municipalNotes}</p>
              </Card>
            )}

            {/* Ask Question */}
            <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <AskQuestion result={result} location={location} />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2 sm:pt-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="flex gap-3">
                <Button onClick={onClose} className="flex-1 min-h-[48px] text-base" size="lg">
                  Got More Trash 🗑️
                </Button>
                <Button 
                  onClick={handleShare} 
                  variant="outline" 
                  className="min-h-[48px] min-w-[48px]"
                  size="icon"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-compostable" />
                  ) : (
                    <Share2 className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-center text-xs sm:text-sm text-muted-foreground">
                Share this revelation or keep sorting. You're killing it either way. 💪
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;