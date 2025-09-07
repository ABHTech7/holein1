import { useState, useEffect } from "react";
import { getRandomGreeting } from "@/lib/greetingUtils";
import { cn } from "@/lib/utils";

interface PlayerGreetingProps {
  firstName?: string;
  className?: string;
  variant?: "hero" | "header" | "card";
}

export const PlayerGreeting = ({ 
  firstName, 
  className,
  variant = "header" 
}: PlayerGreetingProps) => {
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    // Generate a new greeting each time the component mounts or firstName changes
    setGreeting(getRandomGreeting(firstName));
  }, [firstName]);

  const getVariantStyles = () => {
    switch (variant) {
      case "hero":
        return "text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-4";
      case "header":
        return "text-lg md:text-xl font-semibold text-primary mb-2";
      case "card":
        return "text-base font-medium text-primary";
      default:
        return "text-lg font-semibold text-primary";
    }
  };

  if (!greeting) return null;

  return (
    <div className={cn(getVariantStyles(), className)}>
      {greeting}
    </div>
  );
};