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
          color: "text-blue-600",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
          title: "Recycling Bin ♻️",
          subtitle: "Toss it in the blue one",
          emoji: "♻️",
        };
      case "compostable":
        return {
          icon: Leaf,
          color: "text-green-600",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          title: "Compost Bin 🌱",
          subtitle: "Let it rot with dignity",
          emoji: "🌱",
        };
      case "trash":
        return {
          icon: Trash2,
          color: "text-gray-600",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/20",
          title: "Trash Bin 🗑️",
          subtitle: "Into the landfill it goes",
          emoji: "🗑️",
        };
    }
  };

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

  const config = getCategoryConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">The Verdict</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px]">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl space-y-4 sm:space-y-6">
            {/* Category Badge */}
            <Card className={`p-8 text-center border-2 ${config.borderColor} ${config.bgColor}`}>
              <div className={`w-24 h-24 mx-auto rounded-full ${config.bgColor} flex items-center justify-center mb-4`}>
                <Icon className={`w-12 h-12 ${config.color}`} />
              </div>
              <h3 className="text-3xl font-bold mb-2">{config.title}</h3>
              <p className="text-lg text-muted-foreground mb-1">{config.subtitle}</p>
              <p className="text-xl text-foreground font-medium mb-2">{result.item}</p>
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">
                  {result.confidence > 1 ? result.confidence : (result.confidence * 100).toFixed(0)}% sure about this
                </span>
              </div>
            </Card>

            {/* Explanation */}
            <Card className="p-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${config.color === 'text-blue-600' ? 'bg-blue-600' : config.color === 'text-green-600' ? 'bg-green-600' : 'bg-gray-600'}`}></div>
                Why? Here's the deal:
              </h4>
              <p className="text-muted-foreground leading-relaxed">{result.explanation}</p>
            </Card>

            {/* Municipal Notes */}
            {result.municipalNotes && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {location}'s special rules (of course they have some)
                </h4>
                <p className="text-muted-foreground leading-relaxed">{result.municipalNotes}</p>
              </Card>
            )}

            {/* Ask Question */}
            <AskQuestion result={result} location={location} />

            {/* Action Buttons */}
            <div className="space-y-3 pt-2 sm:pt-4">
              <div className="flex gap-3">
                <Button onClick={onClose} className="flex-1 min-h-[48px]" size="lg">
                  Got More Trash
                </Button>
                <Button 
                  onClick={handleShare} 
                  variant="outline" 
                  className="min-h-[48px] min-w-[48px]"
                  size="icon"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Share2 className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-center text-xs sm:text-sm text-muted-foreground">
                Share this revelation or keep sorting. You're killing it either way.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;