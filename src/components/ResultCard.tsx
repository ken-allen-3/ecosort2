import { Recycle, Leaf, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClassificationResult {
  category: "recyclable" | "compostable" | "trash";
  item: string;
  confidence: number;
  explanation: string;
  municipalNotes?: string;
  disclaimer?: string;
}

interface ResultCardProps {
  result: ClassificationResult;
}

const ResultCard = ({ result }: ResultCardProps) => {
  const getCategoryIcon = () => {
    switch (result.category) {
      case "recyclable":
        return <Recycle className="w-8 h-8" />;
      case "compostable":
        return <Leaf className="w-8 h-8" />;
      case "trash":
        return <Trash2 className="w-8 h-8" />;
    }
  };

  const getCategoryColor = () => {
    switch (result.category) {
      case "recyclable":
        return "bg-recyclable text-recyclable-foreground";
      case "compostable":
        return "bg-compostable text-compostable-foreground";
      case "trash":
        return "bg-trash text-trash-foreground";
    }
  };

  return (
    <Card className="p-6 space-y-4 animate-in fade-in-50 slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${getCategoryColor()}`}>
          {getCategoryIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold capitalize">{result.category}</h3>
          <p className="text-muted-foreground">{result.item}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {Math.round(result.confidence * 100)}% confident
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium mb-1">Why?</h4>
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        </div>

        {result.disclaimer && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground italic">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ResultCard;
