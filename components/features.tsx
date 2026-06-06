import {
  Search,
  Gauge,
  FileText,
  Users,
  Share2,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Technical SEO Audit",
    description:
      "Broken links, missing meta tags, duplicate content, crawlability issues — we find them all.",
  },
  {
    icon: Gauge,
    title: "Core Web Vitals",
    description:
      "Page speed, LCP, CLS, and mobile performance scores with specific recommendations.",
  },
  {
    icon: FileText,
    title: "On-Page Analysis",
    description:
      "Title tags, H1 structure, keyword density, image optimization, and schema markup.",
  },
  {
    icon: Users,
    title: "Competitor Benchmarking",
    description:
      "Compare your site against 3 competitors on domain authority, backlinks, and keywords.",
  },
  {
    icon: Share2,
    title: "Marketing Channel Audit",
    description:
      "Blog quality, social presence, email capture, and review platform coverage.",
  },
  {
    icon: AlertTriangle,
    title: "Brutal Verdict",
    description:
      "No sugarcoating — a plain-English summary of what's holding your site back.",
  },
  {
    icon: Lightbulb,
    title: "Prioritized Fix List",
    description:
      "Top 5 issues ranked by traffic impact, with clear action steps for each.",
  },
  {
    icon: TrendingUp,
    title: "Growth Roadmap",
    description:
      "30/60/90 day expectations and what you can realistically achieve.",
  },
];

export function Features() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <feature.icon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
          <p className="text-muted-foreground text-sm">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
