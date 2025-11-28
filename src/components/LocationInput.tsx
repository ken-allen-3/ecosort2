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
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={detectLocation}
          disabled={isDetectingLocation}
          title="Detect my location"
        >
          {isDetectingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>
      {location && (
        <p className="text-xs text-muted-foreground">
          Using disposal rules for {location.trim()}
        </p>
      )}
    </div>
  );
};

export default LocationInput;
