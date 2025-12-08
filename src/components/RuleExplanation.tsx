import { useState } from "react";
import { ChevronDown, ChevronUp, Info, ExternalLink, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RuleExplanationProps {
  reasoning: string[];
  ruleBasis: "city_specific" | "state_guidelines" | "national_guidelines" | "general_knowledge";
  location: string;
  confidenceLevel: "high" | "medium" | "low";
}

const RuleExplanation = ({ reasoning, ruleBasis, location, confidenceLevel }: RuleExplanationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getBasisConfig = () => {
    switch (ruleBasis) {
      case "city_specific":
        return {
          label: `Based on ${location}'s recycling rules`,
          description: "We found info specific to your city's waste program",
          icon: "🏙️",
          badgeClass: "bg-compostable/20 text-compostable border-compostable/30",
        };
      case "state_guidelines":
        return {
          label: "State-level guidelines",
          description: `Using recycling standards for your state since ${location}'s specific rules weren't found`,
          icon: "🗺️",
          badgeClass: "bg-primary/20 text-primary border-primary/30",
        };
      case "national_guidelines":
        return {
          label: "US national recycling standards",
          description: `No local rules found for ${location}. Using general US recycling guidelines.`,
          icon: "🇺🇸",
          badgeClass: "bg-accent/20 text-accent border-accent/30",
        };
      case "general_knowledge":
      default:
        return {
          label: "General recycling knowledge",
          description: "Based on common recycling practices. Your city might do things differently.",
          icon: "📚",
          badgeClass: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const getConfidenceMessage = () => {
    switch (confidenceLevel) {
      case "high":
        return null;
      case "medium":
        return "This is our best guess, but rules can vary. Double-check if you're unsure.";
      case "low":
        return "Honestly? We're not super confident here. Check your city's waste guide to be safe.";
    }
  };

  const basisConfig = getBasisConfig();
  const confidenceMessage = getConfidenceMessage();

  const getSearchUrl = () => {
    const query = encodeURIComponent(`${location} recycling guidelines waste management`);
    return `https://www.google.com/search?q=${query}`;
  };

  return (
    <Card className="border-border/50 overflow-hidden animate-fade-in" style={{ animationDelay: "0.15s" }}>
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 justify-between text-left h-auto hover:bg-muted/50"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Info className="w-4 h-4 text-muted-foreground" />
          How did we figure this out? 🤔
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* Rule Basis Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${basisConfig.badgeClass}`}>
            <span>{basisConfig.icon}</span>
            <span>{basisConfig.label}</span>
          </div>

          {/* Basis Description */}
          <p className="text-sm text-muted-foreground">{basisConfig.description}</p>

          {/* Step-by-step Reasoning */}
          {reasoning && reasoning.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Our logic:</p>
              <ol className="space-y-2">
                {reasoning.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Low Confidence Warning */}
          {confidenceMessage && (
            <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-accent">{confidenceMessage}</p>
            </div>
          )}

          {/* Link to search for local rules */}
          <a
            href={getSearchUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Search for {location}'s official recycling guide
          </a>
        </div>
      )}
    </Card>
  );
};

export default RuleExplanation;
