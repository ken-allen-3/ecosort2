import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LocationRuleSource {
  name: string;
  url: string;
  type: "city" | "county" | "state" | "waste_hauler" | "epa" | "directory" | "general" | "search";
}

export interface LocationRules {
  city: string;
  location: string;
  rule_basis: "city_specific" | "state_guidelines" | "national_guidelines" | "general_knowledge";
  has_curbside_recycling: boolean;
  has_composting: boolean;
  recycling_type: "single-stream" | "multi-stream" | "drop-off only" | "none";
  bin_names: {
    recycling: string;
    compost: string;
    trash: string;
  };
  accepted_items: string[];
  not_accepted: string[];
  special_rules: string[];
  composting_notes: string;
  summary: string;
  fetched_at: string;
  sources?: LocationRuleSource[];
}

interface UseLocationRulesReturn {
  rules: LocationRules | null;
  isLoading: boolean;
  error: string | null;
  fetchRules: (location: string, forceRefresh?: boolean) => Promise<void>;
  clearRules: () => void;
}

const CACHE_KEY = "ecosort-location-rules";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const getCachedRules = (location: string): LocationRules | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as LocationRules;
    
    // Check if cache is for the same location
    if (data.location?.toLowerCase() !== location.toLowerCase()) {
      return null;
    }
    
    // Check if cache is expired
    const fetchedAt = new Date(data.fetched_at).getTime();
    if (Date.now() - fetchedAt > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setCachedRules = (rules: LocationRules) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn("Failed to cache location rules:", e);
  }
};

export const useLocationRules = (): UseLocationRulesReturn => {
  const [rules, setRules] = useState<LocationRules | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached rules on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("ecosort-location");
    if (savedLocation) {
      const cached = getCachedRules(savedLocation);
      if (cached) {
        setRules(cached);
      }
    }
  }, []);

  const fetchRules = useCallback(async (location: string, forceRefresh = false) => {
    if (!location.trim()) {
      setError("Location is required");
      return;
    }

    const trimmedLocation = location.trim();
    
    // Clear cache if force refresh requested
    if (forceRefresh) {
      console.log("Force refresh requested, clearing cache");
      localStorage.removeItem(CACHE_KEY);
    } else {
      // Check cache first
      const cached = getCachedRules(trimmedLocation);
      if (cached) {
        console.log("Using cached location rules for:", trimmedLocation);
        setRules(cached);
        setError(null);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching location rules for:", trimmedLocation);
      
      const { data, error: invokeError } = await supabase.functions.invoke("fetch-location-rules", {
        body: { location: trimmedLocation },
      });

      if (invokeError) {
        throw new Error(invokeError.message || "Failed to fetch location rules");
      }

      if (!data || data.error) {
        throw new Error(data?.error || "No data returned");
      }

      console.log("Location rules fetched:", data.city, data.rule_basis);
      setRules(data);
      setCachedRules(data);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch location rules:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch rules");
      // Don't clear existing rules on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRules = useCallback(() => {
    setRules(null);
    setError(null);
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return { rules, isLoading, error, fetchRules, clearRules };
};
