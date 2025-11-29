import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface QuizSettingsProps {
  quizEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const QuizSettings = ({ quizEnabled, onToggle }: QuizSettingsProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Customize your EcoSort experience
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="quiz-mode" className="text-base">
                Quiz Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Test your knowledge before seeing AI analysis
              </p>
            </div>
            <Switch
              id="quiz-mode"
              checked={quizEnabled}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuizSettings;
