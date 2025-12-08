import { Leaf } from "lucide-react";

interface EnvironmentalImpactProps {
  category: "recyclable" | "compostable" | "trash";
  item: string;
}

const impactMessages: Record<string, { collapsed: string; expanded: string }> = {
  recyclable: {
    collapsed: "Proper recycling reduces energy use and keeps materials in circulation.",
    expanded: "When you recycle correctly, materials get a second life instead of ending up in landfills. This reduces the need for new raw materials, saves energy in manufacturing, and cuts greenhouse gas emissions. Even small items add up—your effort matters.",
  },
  compostable: {
    collapsed: "Composting returns nutrients to the soil and reduces methane emissions.",
    expanded: "Organic waste in landfills produces methane, a potent greenhouse gas. When composted properly, that same waste becomes nutrient-rich soil that helps plants grow. You're closing the loop on nature's cycle—pretty badass, actually.",
  },
  trash: {
    collapsed: "Knowing when something is trash prevents recycling contamination.",
    expanded: "Here's the thing: putting the wrong stuff in recycling can contaminate entire loads, sending everything to landfill anyway. By correctly identifying trash, you're actually protecting the recyclables. Sometimes the right call is the trash bin—and that's okay.",
  },
};

const EnvironmentalImpact = ({ category }: EnvironmentalImpactProps) => {
  const messages = impactMessages[category];

  return (
    <div className="space-y-2 pt-3 border-t border-border/30">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Leaf className="w-3 h-3 text-compostable" />
        Why This Matters
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {messages.expanded}
      </p>
    </div>
  );
};

export default EnvironmentalImpact;
