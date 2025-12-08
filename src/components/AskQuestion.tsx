import { useState } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AskQuestionProps {
  result: {
    category: "recyclable" | "compostable" | "trash";
    item: string;
    confidence: number;
    explanation: string;
    municipalNotes?: string;
  };
  location: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AskQuestion = ({ result, location }: AskQuestionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;

    const userQuestion = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: userQuestion }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ask-about-result", {
        body: { question: userQuestion, result, location },
      });

      if (error) {
        console.error("Error asking question:", error);
        toast.error("Damn, couldn't get an answer. Try again?");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Give it another shot.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    return (
      <div className="pt-3 border-t border-border/30">
        <button
          onClick={() => setIsOpen(true)}
          className="text-sm text-primary hover:underline flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Have a question about this?
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          What's confusing you?
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground"
        >
          Close
        </Button>
      </div>

      {messages.length > 0 && (
        <div className="space-y-3 max-h-[200px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`text-sm p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-primary/10 text-foreground ml-4"
                  : "bg-card text-foreground mr-4 border border-border"
              }`}
            >
              <p className="text-xs font-medium mb-1 text-muted-foreground">
                {msg.role === "user" ? "You" : "Bin Expert"}
              </p>
              <p className="leading-relaxed">{msg.content}</p>
            </div>
          ))}
          {isLoading && (
            <div className="bg-card text-foreground mr-4 border border-border p-3 rounded-lg">
              <p className="text-xs font-medium mb-1 text-muted-foreground">Bin Expert</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Let me think about that...
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., What if it had food on it? Does my city even take this?"
          className="min-h-[44px] resize-none text-sm"
          rows={2}
          disabled={isLoading}
        />
        <Button
          onClick={handleSubmit}
          disabled={!question.trim() || isLoading}
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Ask about weird scenarios, materials, or your city's special rules
      </p>
    </div>
  );
};

export default AskQuestion;