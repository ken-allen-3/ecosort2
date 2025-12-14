import { useState } from "react";
import { History, Recycle, Leaf, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanHistoryItem } from "@/hooks/useScanHistory";
import { formatDistanceToNow } from "date-fns";

interface ScanHistoryProps {
  history: ScanHistoryItem[];
  onClear: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "recyclable":
      return <Recycle className="w-4 h-4" />;
    case "compostable":
      return <Leaf className="w-4 h-4" />;
    default:
      return <Trash2 className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "recyclable":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "compostable":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export default function ScanHistory({ history, onClear }: ScanHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (history.length === 0) return null;

  const displayedHistory = isExpanded ? history : history.slice(0, 3);

  return (
    <Card className="p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-foreground">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg">Your Scan History</h3>
          <span className="text-xs text-muted-foreground">({history.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        {displayedHistory.map((scan) => (
          <div
            key={scan.id}
            className="flex items-center gap-3 p-2 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors"
          >
            {scan.imagePreview && (
              <img
                src={scan.imagePreview}
                alt={scan.item}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{scan.item}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(scan.timestamp, { addSuffix: true })} • {scan.location}
              </p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                scan.category
              )}`}
            >
              {getCategoryIcon(scan.category)}
              <span className="capitalize">{scan.category}</span>
            </div>
          </div>
        ))}
      </div>

      {history.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2 text-muted-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Show {history.length - 3} more
            </>
          )}
        </Button>
      )}
    </Card>
  );
}
