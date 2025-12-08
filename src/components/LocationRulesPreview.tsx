import { Loader2, CheckCircle2, XCircle, Info, Leaf, Recycle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LocationRules } from "@/hooks/useLocationRules";

interface LocationRulesPreviewProps {
  rules: LocationRules | null;
  isLoading: boolean;
  error: string | null;
}

const LocationRulesPreview = ({ rules, isLoading, error }: LocationRulesPreviewProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading local recycling rules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="w-4 h-4 text-accent" />
        <span>Couldn't load local rules. We'll figure it out when you scan.</span>
      </div>
    );
  }

  if (!rules) return null;

  const getBasisLabel = () => {
    switch (rules.rule_basis) {
      case "city_specific":
        return { text: `${rules.city}'s rules loaded`, icon: "🏙️", color: "text-compostable" };
      case "state_guidelines":
        return { text: "Using state guidelines", icon: "🗺️", color: "text-primary" };
      case "national_guidelines":
        return { text: "Using US standards", icon: "🇺🇸", color: "text-accent" };
      default:
        return { text: "General guidelines", icon: "📚", color: "text-muted-foreground" };
    }
  };

  const basis = getBasisLabel();

  return (
    <Card className="p-4 bg-muted/30 border-border/50 animate-fade-in">
      <div className="space-y-3">
        {/* Header with rule basis */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 text-sm font-medium ${basis.color}`}>
            <span>{basis.icon}</span>
            <span>{basis.text}</span>
          </div>
          {rules.has_curbside_recycling && (
            <div className="flex items-center gap-1 text-xs text-recyclable">
              <Recycle className="w-3 h-3" />
              <span>{rules.recycling_type}</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">{rules.summary}</p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 text-xs">
          {rules.has_composting && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-compostable/20 text-compostable rounded-full">
              <Leaf className="w-3 h-3" />
              Composting available
            </span>
          )}
          {rules.bin_names?.recycling && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-recyclable/20 text-recyclable rounded-full">
              <Recycle className="w-3 h-3" />
              {rules.bin_names.recycling}
            </span>
          )}
        </div>

        {/* Common mistakes teaser */}
        {rules.not_accepted && rules.not_accepted.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-accent">⚠️ Common mistakes: </span>
            {rules.not_accepted.slice(0, 3).join(", ")}
            {rules.not_accepted.length > 3 && "..."}
          </div>
        )}
      </div>
    </Card>
  );
};

export default LocationRulesPreview;
