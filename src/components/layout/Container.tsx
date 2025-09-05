import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const Container = ({ children, className, size = "lg" }: ContainerProps) => {
  return (
    <div
      className={cn(
        "mx-auto px-4",
        {
          "max-w-screen-sm": size === "sm",
          "max-w-screen-md": size === "md", 
          "max-w-screen-lg": size === "lg",
          "max-w-screen-xl px-8": size === "xl",
          "w-full": size === "full",
        },
        className
      )}
    >
      {children}
    </div>
  );
};

export default Container;