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

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "recyclable":
        return "bg-recyclable/20 text-recyclable border-recyclable";
      case "compostable":
        return "bg-compostable/20 text-compostable border-compostable";
      case "trash":
        return "bg-trash/20 text-trash border-trash";
    }
  };

  return (
    <div className="mb-4 sm:mb-6 animate-fade-in">
      <h3 className="font-display text-lg sm:text-xl text-muted-foreground mb-3 text-center tracking-wide">
        Try These Common Headaches 🤯
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {examples.map((item, index) => (
          <Card
            key={item.name}
            className="p-3 sm:p-4 cursor-pointer hover:shadow-brutal-lg transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-brutal-sm"
            onClick={() => onExampleClick(item)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="text-center space-y-1.5 sm:space-y-2">
              <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">{item.emoji}</div>
              <p className="text-[10px] sm:text-xs font-bold leading-tight uppercase tracking-wide">{item.name}</p>
              <div
                className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs border-2 font-bold ${getCategoryStyles(
                  item.category
                )}`}
              >
                {getCategoryIcon(item.category)}
                <span className="hidden sm:inline uppercase">{item.category}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExampleImages;