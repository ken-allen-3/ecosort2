import { ExternalLink, AlertTriangle, CheckCircle2, Leaf, Recycle } from "lucide-react";
import { LocationRules } from "@/hooks/useLocationRules";

interface RuleExplanationProps {
  reasoning: string[];
  ruleBasis: "city_specific" | "state_guidelines" | "national_guidelines" | "general_knowledge";
  location: string;
  confidenceLevel: "high" | "medium" | "low";
  locationRules?: LocationRules | null;
}

const RuleExplanation = ({ reasoning, ruleBasis, location, confidenceLevel, locationRules }: RuleExplanationProps) => {

  const getBasisConfig = () => {
    switch (ruleBasis) {
      case "city_specific":
        return {
          label: `Using ${location}'s verified recycling rules`,
          description: "This classification is based on your city's actual waste program guidelines.",
          icon: "🏙️",
          badgeClass: "bg-compostable/20 text-compostable border-compostable/30",
        };
      case "state_guidelines":
        return {
          label: "State-level guidelines",
          description: `Using recycling standards for your state since ${location}'s specific rules weren't found.`,
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
        return "This is our best guess, but rules can vary. Double-check if unsure.";
      case "low":
        return "We're not super confident here. Check your city's waste guide to be safe.";
    }
  };

  const basisConfig = getBasisConfig();
  const confidenceMessage = getConfidenceMessage();

  return (
    <div className="space-y-3">
      {/* Rule Basis Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${basisConfig.badgeClass}`}>
        <span>{basisConfig.icon}</span>
        <span>{basisConfig.label}</span>
      </div>

      {/* Basis Description */}
      <p className="text-sm text-muted-foreground">{basisConfig.description}</p>

      {/* Location Rules Summary - from Perplexity-verified sources */}
      {locationRules && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {locationRules.city}'s Program
          </p>
          <p className="text-sm text-muted-foreground">{locationRules.summary}</p>
          
          <div className="flex flex-wrap gap-1.5 pt-1">
            {locationRules.has_composting && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-compostable/20 text-compostable rounded-full text-xs">
                <Leaf className="w-2.5 h-2.5" />
                Composting available
              </span>
            )}
            {locationRules.bin_names?.recycling && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-recyclable/20 text-recyclable rounded-full text-xs">
                <Recycle className="w-2.5 h-2.5" />
                {locationRules.bin_names.recycling}
              </span>
            )}
          </div>

          {locationRules.not_accepted && locationRules.not_accepted.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-accent">Not recyclable here:</span>{" "}
              {locationRules.not_accepted.slice(0, 3).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Step-by-step Reasoning */}
      {reasoning && reasoning.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How we figured this out:</p>
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

      {/* Verified Sources */}
      {locationRules?.sources && locationRules.sources.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verified sources:</p>
          <div className="flex flex-wrap gap-2">
            {locationRules.sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 hover:underline"
              >
                <CheckCircle2 className="w-3 h-3" />
                {source.name}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleExplanation;
