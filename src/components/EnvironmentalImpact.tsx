import { useState } from "react";
import { ChevronDown, Leaf } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";

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

const EnvironmentalImpact = ({ category, item }: EnvironmentalImpactProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const messages = impactMessages[category];

  return (
    <Card className="border border-border bg-card/50 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-compostable/20 border border-compostable/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Leaf className="w-4 h-4 text-compostable" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              Why This Matters
              <ChevronDown 
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
              />
            </p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {messages.collapsed}
            </p>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="pl-11">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {messages.expanded}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default EnvironmentalImpact;
