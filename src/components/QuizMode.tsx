import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Recycle, Leaf, Trash2, CheckCircle2 } from "lucide-react";

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
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);

  const categories = [
    {
      id: "recyclable" as Category,
      label: "Recycling ♻️",
      icon: Recycle,
      color: "text-recyclable",
      bgColor: "bg-recyclable/20",
      borderColor: "border-recyclable",
    },
    {
      id: "compostable" as Category,
      label: "Compost 🌱",
      icon: Leaf,
      color: "text-compostable",
      bgColor: "bg-compostable/20",
      borderColor: "border-compostable",
    },
    {
      id: "trash" as Category,
      label: "Trash 🗑️",
      icon: Trash2,
      color: "text-trash",
      bgColor: "bg-trash/20",
      borderColor: "border-trash",
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

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = element?.closest('[data-category]');
    
    if (dropZone) {
      const category = dropZone.getAttribute('data-category') as Category;
      setDraggedOver(category);
    } else {
      setDraggedOver(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = element?.closest('[data-category]');
    
    if (dropZone) {
      const category = dropZone.getAttribute('data-category') as Category;
      setSelectedCategory(category);
    }
    
    setIsDragging(false);
    setDraggedOver(null);
    setTouchStartPos(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="font-display text-3xl text-foreground tracking-wide">Quick, Where Does It Go? 🤔</h2>
        <p className="text-muted-foreground">
          Think you know? Drag it or tap to make your guess.
        </p>
      </div>

      {/* Drop Zones */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          const isDraggedOverThis = draggedOver === category.id;

          return (
            <Card
              key={category.id}
              data-category={category.id}
              onClick={() => handleCardClick(category.id)}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category.id)}
              className={`p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-[100px] border-2 ${
                category.bgColor
              } ${
                isSelected
                  ? `ring-4 ring-primary/50 ${category.borderColor} scale-105 animate-shake`
                  : isDraggedOverThis
                  ? `scale-105 ${category.borderColor}`
                  : `border-border hover:${category.borderColor}`
              }`}
            >
              <div
                className={`w-10 h-10 rounded-md ${category.bgColor} border ${category.borderColor} flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${category.color}`} />
              </div>
              <span className={`font-bold text-xs ${category.color}`}>
                {category.label}
              </span>
              {isSelected && (
                <CheckCircle2 className="w-4 h-4 text-primary animate-bounce-in" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Draggable Image */}
      <div className="flex justify-center">
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative rounded-lg overflow-hidden border-3 border-border cursor-move transition-all touch-none ${
            isDragging ? "opacity-50 scale-95 rotate-2" : "hover:scale-105 hover:-rotate-1"
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

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Just Tell Me 🙄
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedCategory}
          className="flex-1"
        >
          Lock It In 🎯
        </Button>
      </div>
    </div>
  );
};

export default QuizMode;