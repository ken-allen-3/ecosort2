import { Sparkles } from "lucide-react";

interface ImpactBadgeProps {
  item: string;
  category: "recyclable" | "compostable" | "trash";
  confidence: number;
}

// Approximate CO2 savings in grams for common recyclable/compostable items
// These are rough estimates based on lifecycle assessments
const impactLookup: Record<string, { co2Grams: number; keywords: string[] }> = {
  aluminum_can: { co2Grams: 150, keywords: ["aluminum", "aluminium", "can", "soda can", "beer can"] },
  plastic_bottle: { co2Grams: 80, keywords: ["plastic bottle", "water bottle", "soda bottle", "pet bottle"] },
  glass_bottle: { co2Grams: 300, keywords: ["glass bottle", "wine bottle", "beer bottle", "glass jar"] },
  cardboard: { co2Grams: 40, keywords: ["cardboard", "cardboard box", "shipping box", "amazon box"] },
  paper: { co2Grams: 20, keywords: ["paper", "newspaper", "magazine", "office paper", "printer paper"] },
  steel_can: { co2Grams: 60, keywords: ["steel can", "tin can", "food can", "soup can"] },
  food_scraps: { co2Grams: 100, keywords: ["food", "food scraps", "vegetable", "fruit", "leftovers", "food waste"] },
  coffee_grounds: { co2Grams: 30, keywords: ["coffee", "coffee grounds", "coffee filter"] },
  yard_waste: { co2Grams: 50, keywords: ["yard waste", "leaves", "grass", "lawn", "garden waste"] },
};

const getImpactEstimate = (item: string, category: string): number | null => {
  // Only show for recyclable or compostable items
  if (category === "trash") return null;
  
  const itemLower = item.toLowerCase();
  
  for (const [, data] of Object.entries(impactLookup)) {
    for (const keyword of data.keywords) {
      if (itemLower.includes(keyword) || keyword.includes(itemLower)) {
        return data.co2Grams;
      }
    }
  }
  
  return null;
};

const formatImpact = (grams: number): string => {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }
  return `${grams}g`;
};

const ImpactBadge = ({ item, category, confidence }: ImpactBadgeProps) => {
  // Only show if confidence is reasonably high
  const normalizedConfidence = confidence > 1 ? confidence / 100 : confidence;
  if (normalizedConfidence < 0.7) return null;
  
  const impact = getImpactEstimate(item, category);
  if (!impact) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-compostable/15 border border-compostable/30 text-compostable animate-fade-in">
      <Sparkles className="w-3 h-3" />
      <span className="text-xs font-medium">
        ~{formatImpact(impact)} CO₂ saved
      </span>
    </div>
  );
};

export default ImpactBadge;
