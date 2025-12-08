import { useState, useEffect } from "react";
import { Info, X, Zap, Leaf, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WhyAIModalProps {
  triggerOnFirstScan?: boolean;
  showTrigger?: boolean;
}

const FIRST_SCAN_KEY = "wfb_first_scan_education_shown";

const WhyAIModal = ({ triggerOnFirstScan = false, showTrigger = true }: WhyAIModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (triggerOnFirstScan) {
      const hasSeenEducation = localStorage.getItem(FIRST_SCAN_KEY);
      if (!hasSeenEducation) {
        // Small delay to let the result modal animate in first
        const timer = setTimeout(() => {
          setIsOpen(true);
          localStorage.setItem(FIRST_SCAN_KEY, "true");
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [triggerOnFirstScan]);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {showTrigger && (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Why does this app use AI?"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Why AI?</span>
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-2 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Why AI? Good Question.
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Tiny Energy Footprint</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A single scan uses about the same energy as loading a webpage. Seriously.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-compostable/20 border border-compostable/30 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-4 h-4 text-compostable" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Massive Impact</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sorting correctly prevents far more emissions than this scan produces.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-recyclable/20 border border-recyclable/30 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-recyclable" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Our Goal</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Help you sort right with the smallest footprint possible. That's it.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center italic">
                TL;DR: The planet wins when you scan. 🌍
              </p>
            </div>
          </div>

          <Button onClick={handleClose} className="w-full">
            Got It 👍
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhyAIModal;
