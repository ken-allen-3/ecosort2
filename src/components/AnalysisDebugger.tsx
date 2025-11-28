import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnalysisDebuggerProps {
  image: string | null;
  location: string;
  isAnalyzing: boolean;
}

const AnalysisDebugger = ({ image, location, isAnalyzing }: AnalysisDebuggerProps) => {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <Card className="p-4 mb-4 bg-muted/50">
      <h4 className="text-xs font-mono mb-2 font-semibold">Debug Info</h4>
      <div className="space-y-1 text-xs font-mono">
        <div className="flex gap-2">
          <span className="text-muted-foreground">Image:</span>
          <Badge variant={image ? "default" : "secondary"}>
            {image ? `${Math.round(image.length / 1024)}KB` : "None"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground">Location:</span>
          <Badge variant={location ? "default" : "secondary"}>
            {location || "Not set"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant={isAnalyzing ? "default" : "outline"}>
            {isAnalyzing ? "Analyzing..." : "Ready"}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default AnalysisDebugger;
