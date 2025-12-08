import { useState, useRef, useMemo } from "react";
import html2canvas from "html2canvas";
import { Recycle, Leaf, Trash2, X, MapPin, Share2, Check, Camera, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AskQuestion from "./AskQuestion";
import RuleExplanation from "./RuleExplanation";
import WhyAIModal from "./WhyAIModal";
import EnvironmentalImpact from "./EnvironmentalImpact";
import ImpactBadge from "./ImpactBadge";

interface ResultSource {
  name: string;
  url: string;
}

interface ResultModalProps {
  result: {
    category: "recyclable" | "compostable" | "trash";
    item: string;
    confidence: number;
    explanation: string;
    municipalNotes?: string;
    rule_basis?: "city_specific" | "state_guidelines" | "national_guidelines" | "general_knowledge";
    reasoning?: string[];
    bin_name?: string;
    sources?: ResultSource[];
  };
  location: string;
  onClose: () => void;
}

const ResultModal = ({ result, location, onClose }: ResultModalProps) => {
  const [copied, setCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const config = useMemo(() => {
    const binName = result.bin_name;
    
    switch (result.category) {
      case "recyclable":
        return {
          icon: Recycle,
          color: "text-recyclable",
          bgColor: "bg-recyclable/20",
          borderColor: "border-recyclable",
          title: binName || "Recycling Bin",
          subtitle: binName ? `Toss it in the ${binName}` : "Toss it in the recycling",
          emoji: "♻️",
          gradient: "from-recyclable/30 to-recyclable/10",
        };
      case "compostable":
        return {
          icon: Leaf,
          color: "text-compostable",
          bgColor: "bg-compostable/20",
          borderColor: "border-compostable",
          title: binName || "Compost Bin",
          subtitle: binName ? `Into the ${binName} it goes` : "Let it rot with dignity",
          emoji: "🌱",
          gradient: "from-compostable/30 to-compostable/10",
        };
      case "trash":
      default:
        return {
          icon: Trash2,
          color: "text-trash",
          bgColor: "bg-trash/20",
          borderColor: "border-trash",
          title: binName || "Trash Bin",
          subtitle: binName ? `Into the ${binName} it goes` : "Into the landfill it goes",
          emoji: "🗑️",
          gradient: "from-trash/30 to-trash/10",
        };
    }
  }, [result.category, result.bin_name]);

  const confidenceLevel = useMemo((): "high" | "medium" | "low" => {
    const conf = result.confidence > 1 ? result.confidence / 100 : result.confidence;
    if (conf >= 0.85) return "high";
    if (conf >= 0.6) return "medium";
    return "low";
  }, [result.confidence]);

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

  const handleScreenshotShare = async () => {
    if (!shareCardRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png", 1.0);
      });
      
      const file = new File([blob], "which-fucking-bin-result.png", { type: "image/png" });
      const shareText = getShareText();
      
      // Try native share with image (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: "Which Fucking Bin?",
            text: shareText,
            files: [file],
          });
          toast.success("Shared! Go viral, you eco-warrior 🚀");
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            setIsCapturing(false);
            return;
          }
        }
      }
      
      // Fallback: Download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `which-fucking-bin-${result.item.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Also copy text to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${window.location.origin}`);
        toast.success("Screenshot saved! Caption copied to clipboard 📋");
      } catch {
        toast.success("Screenshot saved! Now go share that shit 📸");
      }
      
    } catch (err) {
      console.error("Screenshot failed:", err);
      toast.error("Screenshot failed. Your device is being a little bitch.");
    } finally {
      setIsCapturing(false);
    }
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
            {/* Shareable Card - This gets captured for screenshot */}
            <div ref={shareCardRef} className="space-y-4">
              {/* Category Badge */}
              <Card className={`p-8 text-center border-3 ${config.borderColor} ${config.bgColor} animate-bounce-in`}>
                <div className={`w-24 h-24 mx-auto rounded-lg ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center mb-4 animate-wiggle`}>
                  <Icon className={`w-12 h-12 ${config.color}`} />
                </div>
                <h3 className="font-display text-4xl sm:text-5xl mb-2 tracking-wide">{config.title} {config.emoji}</h3>
                <p className="text-lg text-muted-foreground mb-1">{config.subtitle}</p>
                <p className="text-xl text-foreground font-bold mb-2">{result.item}</p>
                
                {/* Impact Badge - only shows for recognized items */}
                <div className="mb-3">
                  <ImpactBadge 
                    item={result.item} 
                    category={result.category} 
                    confidence={result.confidence} 
                  />
                </div>
                
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-full border border-border">
                  <span className="font-medium">
                    {result.confidence > 1 ? result.confidence : (result.confidence * 100).toFixed(0)}% sure about this
                  </span>
                </div>
              </Card>

              {/* Explanation with inline citations */}
              <Card className="p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <h4 className="font-display text-xl mb-3 flex items-center gap-2 tracking-wide">
                  <div className={`w-3 h-3 rounded-sm ${config.bgColor} border ${config.borderColor}`}></div>
                  Why? Here's the Deal:
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {result.explanation}
                  {result.sources && result.sources.length > 0 && (
                    <span className="ml-1">
                      {result.sources.map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:text-primary/80 hover:underline transition-colors ml-1"
                          title={source.name}
                        >
                          <sup className="text-[10px] font-medium">[{index + 1}]</sup>
                        </a>
                      ))}
                    </span>
                  )}
                </p>
                
                {/* Source list */}
                {result.sources && result.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground/70">
                    <span className="font-medium">Sources: </span>
                    {result.sources.map((source, index) => (
                      <span key={index}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-0.5"
                        >
                          <sup className="mr-0.5">[{index + 1}]</sup>
                          {source.name}
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                        {index < result.sources!.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                )}
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

              {/* Branding for screenshot */}
              <div className="text-center py-2">
                <p className="font-display text-sm text-muted-foreground tracking-widest">whichfuckingbin.com</p>
              </div>
            </div>

            {/* Primary Action - Most prominent */}
            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Button onClick={onClose} className="w-full min-h-[52px] text-lg font-display" size="lg">
                Scan Another Item
              </Button>
            </div>

            {/* Secondary Actions - Less prominent */}
            <div className="flex gap-2 animate-fade-in" style={{ animationDelay: "0.25s" }}>
              <Button 
                onClick={handleScreenshotShare}
                disabled={isCapturing}
                variant="outline"
                className="flex-1 min-h-[44px]"
              >
                {isCapturing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                    Capturing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Share Screenshot
                  </span>
                )}
              </Button>
              <Button 
                onClick={handleShare} 
                variant="outline" 
                className="min-h-[44px] min-w-[44px]"
                size="icon"
                title="Share text"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-compostable" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Collapsible "Learn More" Section - Consolidates all educational content */}
            <div className="border-t border-border/50 pt-4 mt-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                  <span className="flex items-center gap-2">
                    <span>Learn more about this verdict</span>
                  </span>
                  <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="space-y-3 pt-3">
                  {/* How we figured this out */}
                  <RuleExplanation
                    reasoning={result.reasoning || []}
                    ruleBasis={result.rule_basis || "general_knowledge"}
                    location={location}
                    confidenceLevel={confidenceLevel}
                  />

                  {/* Environmental Impact */}
                  <EnvironmentalImpact 
                    category={result.category} 
                    item={result.item} 
                  />

                  {/* Ask Question */}
                  <AskQuestion result={result} location={location} />
                </div>
              </details>
            </div>

            {/* Minimal footer with Why AI link */}
            <div className="flex items-center justify-center pt-2 text-xs text-muted-foreground/70">
              <WhyAIModal showTrigger={true} triggerOnFirstScan={false} />
            </div>
            
            {/* Why AI? Micro-Modal - triggers on first scan */}
            <WhyAIModal triggerOnFirstScan={true} showTrigger={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;