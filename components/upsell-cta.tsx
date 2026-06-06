import { cn, getSeverityColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, AlertCircle, Info, ExternalLink } from "lucide-react";

interface UpsellCtaProps {
  finding: {
    title: string;
    severity: string;
    serviceId?: string;
    serviceCta?: string;
  };
  onCtaClick?: (serviceId: string) => void;
}

const serviceDetails: Record<string, { name: string; description: string }> = {
  "technical-seo": {
    name: "Technical SEO & Performance Optimisation",
    description: "We'll fix your site speed and technical issues in 30 days.",
  },
  "onpage-seo": {
    name: "On-Page SEO Sprint",
    description: "Complete on-page optimization for all your key pages.",
  },
  "link-building": {
    name: "Digital PR & Link Building",
    description: "Build authoritative backlinks that move the needle.",
  },
  "content-strategy": {
    name: "Content Strategy & SEO Writing",
    description: "Content that ranks and converts.",
  },
  "local-seo": {
    name: "Local SEO Setup",
    description: "Dominate your local market search results.",
  },
  "full-retainer": {
    name: "Full SEO Retainer",
    description: "Comprehensive SEO management and growth.",
  },
  "cro": {
    name: "Conversion Rate Optimisation",
    description: "Turn more visitors into customers.",
  },
  "social-media": {
    name: "Social Media Management",
    description: "We'll handle your social presence end-to-end.",
  },
};

const severityIcons = {
  CRITICAL: AlertTriangle,
  WARNING: AlertCircle,
  INFO: Info,
};

export function UpsellCta({ finding, onCtaClick }: UpsellCtaProps) {
  if (!finding.serviceId) return null;

  const service = serviceDetails[finding.serviceId];
  if (!service) return null;

  const SeverityIcon = severityIcons[finding.severity as keyof typeof severityIcons] || Info;

  return (
    <div
      className={cn(
        "upsell-cta mt-4 p-4 rounded-lg border-2 border-accent/30 bg-accent/5"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <SeverityIcon className="w-5 h-5 text-accent" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-accent">{service.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
          <p className="text-sm font-medium mt-2">{finding.serviceCta}</p>
          <Button
            variant="accent"
            size="sm"
            className="mt-3"
            onClick={() => onCtaClick?.(finding.serviceId!)}
          >
            Learn More
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}
