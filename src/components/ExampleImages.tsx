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
    description: "Clean plastic bottles can be recycled",
  },
  {
    name: "Apple Core",
    category: "compostable",
    emoji: "🍎",
    description: "Food scraps make great compost",
  },
  {
    name: "Styrofoam Cup",
    category: "trash",
    emoji: "☕",
    description: "Most styrofoam cannot be recycled",
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
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
        Try these examples
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {examples.map((item) => (
          <Card
            key={item.name}
            className="p-4 cursor-pointer hover:shadow-lg transition-all hover-scale"
            onClick={() => onExampleClick(item)}
          >
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">{item.emoji}</div>
              <p className="text-xs font-medium">{item.name}</p>
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCategoryColor(
                  item.category
                )}`}
              >
                {getCategoryIcon(item.category)}
                {item.category}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExampleImages;
