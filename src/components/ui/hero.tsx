import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import Section from "../layout/Section";

interface HeroProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "image";
  backgroundImage?: string;
}

const Hero = ({ 
  children, 
  className, 
  variant = "gradient",
  backgroundImage 
}: HeroProps) => {
  return (
    <Section
      spacing="xl"
      background={variant === "gradient" ? "gradient" : "default"}
      className={cn(
        "relative overflow-hidden",
        variant === "image" && backgroundImage && "bg-cover bg-center bg-no-repeat",
        className
      )}
    >
      {variant === "image" && backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      {variant === "image" && (
        <div className="absolute inset-0 bg-primary/80" />
      )}
      <div className="relative z-10 text-center">
        {children}
      </div>
    </Section>
  );
};

interface HeroTitleProps {
  children: ReactNode;
  className?: string;
}

const HeroTitle = ({ children, className }: HeroTitleProps) => {
  return (
    <h1 className={cn(
      "font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6",
      className
    )}>
      {children}
    </h1>
  );
};

interface HeroSubtitleProps {
  children: ReactNode;
  className?: string;
}

const HeroSubtitle = ({ children, className }: HeroSubtitleProps) => {
  return (
    <p className={cn(
      "text-lg md:text-xl text-primary-foreground/90 max-w-3xl mx-auto mb-8",
      className
    )}>
      {children}
    </p>
  );
};

interface HeroActionsProps {
  children: ReactNode;
  className?: string;
}

const HeroActions = ({ children, className }: HeroActionsProps) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-4 justify-center items-center",
      className
    )}>
      {children}
    </div>
  );
};

export { Hero, HeroTitle, HeroSubtitle, HeroActions };