import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationInputProps {
  location: string;
  setLocation: (location: string) => void;
  isDetectingLocation: boolean;
  detectLocation: () => void;
}

const LocationInput = ({
  location,
  setLocation,
  isDetectingLocation,
  detectLocation,
}: LocationInputProps) => {
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent excessively long input
    const value = e.target.value.slice(0, 100);
    setLocation(value);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Enter your city (e.g., San Ramon, Long Beach)"
            value={location}
            onChange={handleLocationChange}
            className="w-full"
            maxLength={100}
            disabled={isDetectingLocation}
            aria-label="Enter your city location"
            autoComplete="address-level2"
          />
        </div>
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
      </div>
      {location && (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          Using disposal rules for {location.trim()}
        </p>
      )}
    </div>
  );
};

export default LocationInput;
