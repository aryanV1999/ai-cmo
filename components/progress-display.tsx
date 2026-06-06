"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Globe,
  Search,
  Gauge,
  FileText,
  Users,
  Brain,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "pending" | "in-progress" | "complete" | "error";
}

interface ProgressDisplayProps {
  progress: number;
  currentStep: string;
  status: string;
}

const steps: ProgressStep[] = [
  { id: "crawling", label: "Crawling website pages", icon: Globe, status: "pending" },
  { id: "technical", label: "Analyzing technical SEO", icon: Search, status: "pending" },
  { id: "speed", label: "Checking page speed", icon: Gauge, status: "pending" },
  { id: "onpage", label: "Reviewing on-page elements", icon: FileText, status: "pending" },
  { id: "competitors", label: "Benchmarking competitors", icon: Users, status: "pending" },
  { id: "ai", label: "Generating brutal verdict", icon: Brain, status: "pending" },
];

export function ProgressDisplay({
  progress,
  currentStep,
  status,
}: ProgressDisplayProps) {
  const [displaySteps, setDisplaySteps] = useState<ProgressStep[]>(steps);

  useEffect(() => {
    // Update step statuses based on current progress
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    
    setDisplaySteps(
      steps.map((step, index) => ({
        ...step,
        status:
          index < stepIndex
            ? "complete"
            : index === stepIndex
            ? status === "FAILED"
              ? "error"
              : "in-progress"
            : "pending",
      }))
    );
  }, [currentStep, status]);

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Analyzing your website...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Steps list */}
      <div className="space-y-4">
        {displaySteps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-all",
                step.status === "complete" &&
                  "bg-green-50 border-green-200",
                step.status === "in-progress" &&
                  "bg-blue-50 border-blue-200 shadow-sm",
                step.status === "pending" &&
                  "bg-slate-50 border-slate-200 opacity-60",
                step.status === "error" &&
                  "bg-red-50 border-red-200"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  step.status === "complete" && "bg-green-500",
                  step.status === "in-progress" && "bg-blue-500",
                  step.status === "pending" && "bg-slate-300",
                  step.status === "error" && "bg-red-500"
                )}
              >
                {step.status === "complete" ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : step.status === "in-progress" ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Icon className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "font-medium",
                    step.status === "complete" && "text-green-700",
                    step.status === "in-progress" && "text-blue-700",
                    step.status === "pending" && "text-slate-500",
                    step.status === "error" && "text-red-700"
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated time */}
      <p className="text-center text-sm text-muted-foreground">
        Estimated time remaining: ~{Math.max(5, Math.round((100 - progress) * 0.6))} seconds
      </p>
    </div>
  );
}
