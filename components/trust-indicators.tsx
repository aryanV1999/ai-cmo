import { CheckCircle, Clock, Lock, Zap } from "lucide-react";

const indicators = [
  {
    icon: Zap,
    value: "60",
    label: "Second Audits",
  },
  {
    icon: CheckCircle,
    value: "80+",
    label: "SEO Signals Checked",
  },
  {
    icon: Clock,
    value: "500+",
    label: "Audits Completed",
  },
  {
    icon: Lock,
    value: "100%",
    label: "GDPR Compliant",
  },
];

export function TrustIndicators() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      {indicators.map((indicator) => (
        <div key={indicator.label} className="space-y-2">
          <indicator.icon className="w-8 h-8 mx-auto text-accent" />
          <div className="text-3xl md:text-4xl font-bold">{indicator.value}</div>
          <div className="text-sm text-white/80">{indicator.label}</div>
        </div>
      ))}
    </div>
  );
}
