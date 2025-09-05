import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import Container from "./Container";

interface SectionProps {
  children: ReactNode;
  className?: string;
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  background?: "default" | "muted" | "primary" | "gradient";
}

const Section = ({ 
  children, 
  className, 
  containerSize = "lg",
  spacing = "lg",
  background = "default"
}: SectionProps) => {
  return (
    <section
      className={cn(
        "w-full",
        {
          "py-0": spacing === "none",
          "py-8": spacing === "sm",
          "py-12": spacing === "md", 
          "py-16 lg:py-24": spacing === "lg",
          "py-20 lg:py-32": spacing === "xl",
        },
        {
          "bg-background": background === "default",
          "bg-muted": background === "muted",
          "bg-primary": background === "primary",
          "bg-gradient-hero": background === "gradient",
        },
        className
      )}
    >
      <Container size={containerSize}>
        {children}
      </Container>
    </section>
  );
};

export default Section;