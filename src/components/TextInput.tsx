import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TextInputProps {
  onSubmit: (itemText: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const TextInput = ({ onSubmit, isLoading, disabled }: TextInputProps) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed && !isLoading && !disabled) {
      onSubmit(trimmed);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Or type an item (e.g., pizza box, yogurt cup)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading || disabled}
          maxLength={200}
          className="flex-1 bg-muted/50 border-border/50 placeholder:text-muted-foreground/50"
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={!text.trim() || isLoading || disabled}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default TextInput;
