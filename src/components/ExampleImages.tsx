import { Card } from "@/components/ui/card";
import { Recycle, Leaf, Trash2 } from "lucide-react";

interface ExampleItem {
  name: string;
  category: "recyclable" | "compostable" | "trash";
  emoji: string;
  description: string;
}

const examples: ExampleItem[] = [
  {
    name: "Plastic Bottle",
    category: "recyclable",
    emoji: "🍾",
    description: "Empty it, rinse it, toss it in recycling. Not rocket science.",
  },
  {
    name: "Apple Core",
    category: "compostable",
    emoji: "🍎",
    description: "Let it become dirt. Circle of life and all that.",
  },
  {
    name: "Styrofoam Cup",
    category: "trash",
    emoji: "☕",
    description: "Landfill fodder. Most places can't recycle this crap.",
  },
];

interface ExampleImagesProps {
  onExampleClick: (item: ExampleItem) => void;
}

const ExampleImages = ({ onExampleClick }: ExampleImagesProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "recyclable":
        return <Recycle className="w-4 h-4" />;
      case "compostable":
        return <Leaf className="w-4 h-4" />;
      case "trash":
        return <Trash2 className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "recyclable":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "compostable":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "trash":
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 text-center">
        Try these common headaches
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {examples.map((item) => (
          <Card
            key={item.name}
            className="p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all hover-scale active:scale-95"
            onClick={() => onExampleClick(item)}
          >
            <div className="text-center space-y-1.5 sm:space-y-2">
              <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">{item.emoji}</div>
              <p className="text-[10px] sm:text-xs font-medium leading-tight">{item.name}</p>
              <div
                className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs border ${getCategoryColor(
                  item.category
                )}`}
              >
                {getCategoryIcon(item.category)}
                <span className="hidden sm:inline">{item.category}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExampleImages;