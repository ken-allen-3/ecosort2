import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Recycle, Leaf, Trash2, CheckCircle2, XCircle } from "lucide-react";

interface QuizModeProps {
  image: string;
  onComplete: (userGuess: "recyclable" | "compostable" | "trash") => void;
  onSkip: () => void;
}

type Category = "recyclable" | "compostable" | "trash";

const QuizMode = ({ image, onComplete, onSkip }: QuizModeProps) => {
  const [draggedOver, setDraggedOver] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const categories = [
    {
      id: "recyclable" as Category,
      label: "Recyclable",
      icon: Recycle,
      color: "text-recyclable",
      bgColor: "bg-recyclable/10",
      borderColor: "border-recyclable/30",
    },
    {
      id: "compostable" as Category,
      label: "Compostable",
      icon: Leaf,
      color: "text-compostable",
      bgColor: "bg-compostable/10",
      borderColor: "border-compostable/30",
    },
    {
      id: "trash" as Category,
      label: "Trash",
      icon: Trash2,
      color: "text-trash",
      bgColor: "bg-trash/10",
      borderColor: "border-trash/30",
    },
  ];

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedOver(null);
  };

  const handleDragOver = (e: React.DragEvent, category: Category) => {
    e.preventDefault();
    setDraggedOver(category);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  const handleDrop = (e: React.DragEvent, category: Category) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggedOver(null);
    setSelectedCategory(category);
  };

  const handleCardClick = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleSubmit = () => {
    if (selectedCategory) {
      onComplete(selectedCategory);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Quiz Mode</h2>
        <p className="text-muted-foreground">
          Where should this item go? Drag or tap to make your guess.
        </p>
      </div>

      {/* Draggable Image */}
      <div className="flex justify-center">
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={`relative rounded-xl overflow-hidden border-2 border-border cursor-move transition-all ${
            isDragging ? "opacity-50 scale-95" : "hover:scale-105"
          }`}
          style={{ maxWidth: "200px", maxHeight: "200px" }}
        >
          <img
            src={image}
            alt="Item to classify"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Drop Zones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          const isDraggedOverThis = draggedOver === category.id;

          return (
            <Card
              key={category.id}
              onClick={() => handleCardClick(category.id)}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category.id)}
              className={`p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-[160px] ${
                category.bgColor
              } ${category.borderColor} border-2 ${
                isSelected
                  ? "ring-4 ring-primary/50 border-primary scale-105"
                  : isDraggedOverThis
                  ? "scale-105 border-primary"
                  : "hover:scale-102"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full ${category.bgColor} flex items-center justify-center`}
              >
                <Icon className={`w-8 h-8 ${category.color}`} />
              </div>
              <span className={`font-semibold ${category.color}`}>
                {category.label}
              </span>
              {isSelected && (
                <CheckCircle2 className="w-5 h-5 text-primary animate-scale-in" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip Quiz
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedCategory}
          className="flex-1"
        >
          Submit Guess
        </Button>
      </div>
    </div>
  );
};

export default QuizMode;
