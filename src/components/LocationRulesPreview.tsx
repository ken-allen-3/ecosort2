import { useState } from "react";
import { Loader2, Leaf, Recycle, AlertTriangle, ChevronDown, CheckCircle2, ExternalLink, RefreshCw, Search } from "lucide-react";
import { LocationRules } from "@/hooks/useLocationRules";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LocationRulesPreviewProps {
  rules: LocationRules | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const LocationRulesPreview = ({ rules, isLoading, error, onRefresh }: LocationRulesPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading local rules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="w-3 h-3 text-accent" />
        <span>Rules unavailable</span>
      </div>
    );
  }

  if (!rules) return null;

  const getBasisBadge = () => {
    switch (rules.rule_basis) {
      case "city_specific":
        return { text: `${rules.city} rules`, color: "text-compostable" };
      case "state_guidelines":
        return { text: "State rules", color: "text-primary" };
      default:
        return { text: "US standards", color: "text-muted-foreground" };
    }
  };

  const basis = getBasisBadge();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity">
        <CheckCircle2 className={`w-3 h-3 ${basis.color}`} />
        <span className={basis.color}>{basis.text}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50 text-xs space-y-2 animate-fade-in">
          <p className="text-muted-foreground">{rules.summary}</p>
          
          <div className="flex flex-wrap gap-1.5">
            {rules.has_composting && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-compostable/20 text-compostable rounded-full">
                <Leaf className="w-2.5 h-2.5" />
                Compost
              </span>
            )}
            {rules.bin_names?.recycling && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-recyclable/20 text-recyclable rounded-full">
                <Recycle className="w-2.5 h-2.5" />
                {rules.bin_names.recycling}
              </span>
            )}
          </div>

          {rules.not_accepted && rules.not_accepted.length > 0 && (
            <p className="text-muted-foreground">
              <span className="text-accent">⚠️</span> {rules.not_accepted.slice(0, 3).join(", ")}
            </p>
          )}

          {rules.sources && rules.sources.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between mb-1">
                <p className="text-muted-foreground/70">Sources:</p>
                {onRefresh && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
                    title="Refresh sources"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {rules.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline transition-colors"
                  >
                    {source.type === "search" && <Search className="w-2.5 h-2.5" />}
                    <span>{source.name}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default LocationRulesPreview;
