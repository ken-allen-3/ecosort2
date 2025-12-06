import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { usCities } from "@/data/usCities";

interface LocationInputProps {
  location: string;
  setLocation: (location: string) => void;
  isDetectingLocation?: boolean;
  detectLocation?: () => void;
  showDetectButton?: boolean;
  showStatusText?: boolean;
  placeholder?: string;
  inputClassName?: string;
  onEnter?: () => void;
}

const LocationInput = ({
  location,
  setLocation,
  isDetectingLocation = false,
  detectLocation,
  showDetectButton = true,
  showStatusText = true,
  placeholder = "Enter your city (e.g., San Ramon, Long Beach)",
  inputClassName = "",
  onEnter,
}: LocationInputProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 100);
    setLocation(value);
    
    if (value.trim().length >= 2) {
      const filtered = usCities
        .filter(city => city.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setLocation(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[highlightedIndex]);
      } else if (onEnter) {
        onEnter();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={location}
            onChange={handleLocationChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className={`w-full ${inputClassName}`}
            maxLength={100}
            disabled={isDetectingLocation}
            aria-label="Enter your city location"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
              role="listbox"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                    index === highlightedIndex ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onClick={() => selectSuggestion(suggestion)}
                  role="option"
                  aria-selected={index === highlightedIndex}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        {showDetectButton && detectLocation && (
          <Button
            variant="outline"
            size="icon"
            onClick={detectLocation}
            disabled={isDetectingLocation}
            title="Detect my location"
            aria-label="Detect my location automatically"
            type="button"
          >
            {isDetectingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <MapPin className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      {showStatusText && location && (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          Using disposal rules for {location.trim()}
        </p>
      )}
    </div>
  );
};

export default LocationInput;
