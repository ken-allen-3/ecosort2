import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Flag, Send, X, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FeedbackFormProps {
  itemName: string;
  currentCategory: string;
  userLocation: string;
  imageData?: string;
  onClose: () => void;
}

const categories = [
  { value: "recyclable", label: "Recyclable", color: "text-recyclable" },
  { value: "compostable", label: "Compostable", color: "text-compostable" },
  { value: "trash", label: "Trash", color: "text-trash" },
  { value: "hazardous", label: "Hazardous", color: "text-orange-500" },
  { value: "special", label: "Special Disposal", color: "text-purple-500" },
];

const FeedbackForm = ({ 
  itemName, 
  currentCategory, 
  userLocation, 
  imageData,
  onClose 
}: FeedbackFormProps) => {
  const [suggestedCategory, setSuggestedCategory] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const sendToZapier = async () => {
    const webhookUrl = "https://hooks.zapier.com/hooks/catch/9034799/ufp7qyi/";

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          item_name: itemName,
          reported_category: currentCategory,
          suggested_category: suggestedCategory || "",
          user_location: userLocation,
          feedback_text: feedbackText || "",
          has_image: !!imageData,
        }),
      });
      console.log("Feedback sent to Zapier");
    } catch (error) {
      console.error("Error sending to Zapier:", error);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("verdict_feedback").insert({
        item_name: itemName,
        reported_category: currentCategory,
        suggested_category: suggestedCategory || null,
        user_location: userLocation,
        feedback_text: feedbackText || null,
        image_data: imageData || null,
      });

      if (error) throw error;

      // Send to Zapier in background (don't await)
      sendToZapier();

      setIsSubmitted(true);
      toast({
        title: "Feedback received!",
        description: "Thanks for helping us get better at this shit.",
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Oops, something broke",
        description: "Couldn't submit your feedback. Try again?",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border-2 border-border text-center space-y-3">
        <CheckCircle className="w-10 h-10 text-compostable mx-auto" />
        <p className="font-display font-bold">Got it, thanks!</p>
        <p className="text-sm text-muted-foreground">
          We'll use this to make our AI less dumb.
        </p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/50 rounded-lg border-2 border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-destructive" />
          <span className="font-display font-bold text-sm">Report Wrong Verdict</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            What should "{itemName}" actually be?
          </Label>
          <RadioGroup value={suggestedCategory} onValueChange={setSuggestedCategory}>
            <div className="grid grid-cols-2 gap-2">
              {categories
                .filter((cat) => cat.value !== currentCategory)
                .map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={cat.value} id={cat.value} />
                    <Label 
                      htmlFor={cat.value} 
                      className={`text-sm cursor-pointer ${cat.color}`}
                    >
                      {cat.label}
                    </Label>
                  </div>
                ))}
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            Any extra details? (optional)
          </Label>
          <Textarea
            placeholder="e.g., 'My city accepts this in recycling' or 'This is actually hazardous waste'"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="text-sm min-h-[60px] resize-none"
            maxLength={500}
          />
        </div>
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        className="w-full"
        size="sm"
      >
        {isSubmitting ? (
          "Sending..."
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Feedback
          </>
        )}
      </Button>
    </div>
  );
};

export default FeedbackForm;
