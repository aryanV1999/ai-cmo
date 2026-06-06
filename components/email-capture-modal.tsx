"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, Unlock, Shield } from "lucide-react";

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  auditId: string;
  score: number;
}

export function EmailCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  auditId,
  score,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-accent" />
            Unlock Your Full Report
          </DialogTitle>
          <DialogDescription>
            Your audit scored <strong className="text-primary">{score}/100</strong>.
            Enter your email to unlock the complete findings and fix recommendations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className={`pl-10 h-12 ${error ? "border-red-500" : ""}`}
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          <Button
            type="submit"
            variant="accent"
            className="w-full h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Unlocking Report...
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Unlock My Full Report
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>
              We&apos;ll send helpful SEO tips. Unsubscribe anytime. GDPR compliant.
            </span>
          </div>
        </form>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">What you&apos;ll get:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Full technical SEO breakdown</li>
            <li>✓ Competitor comparison data</li>
            <li>✓ Prioritized fix list with impact estimates</li>
            <li>✓ Downloadable PDF report</li>
            <li>✓ Free SEO improvement checklist</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
