import { cn, getGradeColor } from "@/lib/utils";

interface GradeBadgeProps {
  grade: string;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
}

const sizeClasses = {
  sm: "w-12 h-12 text-lg",
  md: "w-16 h-16 text-2xl",
  lg: "w-24 h-24 text-4xl",
  xl: "w-32 h-32 text-5xl",
};

export function GradeBadge({ grade, size = "md", animate = false }: GradeBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold border-4",
        sizeClasses[size],
        getGradeColor(grade),
        animate && "grade-badge-animate"
      )}
    >
      {grade}
    </div>
  );
}
