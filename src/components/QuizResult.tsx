import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface QuizResultProps {
  userGuess: "recyclable" | "compostable" | "trash";
  correctAnswer: "recyclable" | "compostable" | "trash";
  onContinue: () => void;
}

const QuizResult = ({ userGuess, correctAnswer, onContinue }: QuizResultProps) => {
  const isCorrect = userGuess === correctAnswer;

  return (
    <Card className={`p-6 space-y-4 animate-scale-in ${
      isCorrect ? "bg-compostable/10 border-compostable" : "bg-destructive/10 border-destructive"
    }`}>
      <div className="flex items-center justify-center gap-3">
        {isCorrect ? (
          <CheckCircle2 className="w-12 h-12 text-compostable" />
        ) : (
          <XCircle className="w-12 h-12 text-destructive" />
        )}
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold">
          {isCorrect ? "Correct!" : "Not quite!"}
        </h3>
        <p className="text-muted-foreground">
          {isCorrect ? (
            <>You guessed <span className="font-semibold text-foreground">{userGuess}</span> and that's correct!</>
          ) : (
            <>
              You guessed <span className="font-semibold text-foreground">{userGuess}</span>, but the correct answer is{" "}
              <span className="font-semibold text-foreground">{correctAnswer}</span>.
            </>
          )}
        </p>
      </div>

      <Button onClick={onContinue} className="w-full" size="lg">
        See Detailed Analysis
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};

export default QuizResult;
