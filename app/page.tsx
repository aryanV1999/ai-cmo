import { UrlInput } from "@/components/url-input";
import { TrustIndicators } from "@/components/trust-indicators";
import { Zap, Shield, Bot, BarChart3, Search, CheckCircle2, Brain } from "lucide-react";

const GEO_PROVIDERS = [
  { name: "ChatGPT", score: "?" },
  { name: "Claude", score: "?" },
  { name: "Perplexity", score: "?" },
  { name: "Gemini", score: "?" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-primary">Motion Labs AI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-primary transition">How It Works</a>
            <a href="#features" className="hover:text-primary transition">Features</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-8 uppercase tracking-wide">
            <Bot className="w-3.5 h-3.5" />
            AI-Native SEO + GEO Audit â€” Free
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-5 leading-tight tracking-tight">
            Rank on Google.<br />
            <span className="text-accent">Appear on AI.</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Get a full SEO audit + AI visibility score across ChatGPT, Perplexity, Claude, and Gemini.
            Evidence-backed findings. Prioritised fixes. Daily actions.
          </p>

          <UrlInput />

          <p className="text-sm text-muted-foreground mt-5">
            âœ“ No account needed &nbsp;Â·&nbsp; âœ“ Results in ~60 seconds &nbsp;Â·&nbsp; âœ“ 100% free
          </p>
        </div>
      </section>

      {/* GEO PROVIDER SCORECARD PREVIEW */}
      <section className="py-10 bg-slate-50 border-y">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-center text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wide">
            AI Visibility â€” how you appear across AI answer engines
          </p>
          <div className="grid grid-cols-4 gap-3">
            {GEO_PROVIDERS.map(p => (
              <div key={p.name} className="bg-white rounded-xl border p-4 text-center shadow-sm">
                <p className="text-xs font-medium text-muted-foreground mb-2">{p.name}</p>
                <p className="text-3xl font-bold text-slate-300">?</p>
                <p className="text-xs text-slate-400 mt-1">Run audit to reveal</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-STEP HOW IT WORKS */}
      <section className="py-20 px-4" id="how-it-works">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3">
              From audit to actions in 3 steps
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Set it up once. Get daily prioritised fixes delivered to your action center.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <Search className="w-6 h-6 text-accent" />,
                title: "Run the Audit",
                desc: "Full snapshot: SEO score, Core Web Vitals, technical health, on-page signals, content quality, and internal link graph.",
              },
              {
                step: "02",
                icon: <Brain className="w-6 h-6 text-accent" />,
                title: "See Your AI Visibility",
                desc: "Track how your brand appears across ChatGPT, Perplexity, Claude, and Gemini. GEO score, citation quality, and sentiment.",
              },
              {
                step: "03",
                icon: <CheckCircle2 className="w-6 h-6 text-accent" />,
                title: "Get 2 Fixes Every Day",
                desc: "Evidence-backed recommendations ranked by Impact Ã— Confidence Ã· Effort. Step-by-step fixes with copy-ready code snippets.",
              },
            ].map(item => (
              <div key={item.step} className="relative p-6 rounded-2xl border bg-white shadow-sm">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{item.step}</span>
                </div>
                <div className="mb-3 mt-2">{item.icon}</div>
                <h3 className="text-lg font-semibold text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-slate-50 px-4" id="features">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-primary mb-3">Complete audit intelligence suite</h2>
            <p className="text-muted-foreground">Everything Semrush + Ahrefs + an AI visibility tool would give you â€” in one free report.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "ðŸ”", title: "Technical SEO", desc: "Crawlability, canonicals, sitemap, robots.txt, redirect chains, schema coverage." },
              { icon: "ðŸ“„", title: "On-Page SEO", desc: "Titles, meta descriptions, H1s, alt texts, content quality, thin content detection." },
              { icon: "âš¡", title: "Core Web Vitals", desc: "LCP, CLS, TBT with PageSpeed Insights integration and specific fix guidance." },
              { icon: "ðŸ”—", title: "Link Graph", desc: "Internal link authority flow, orphan page detection, click depth, anchor diversity." },
              { icon: "ðŸ¤–", title: "GEO Visibility", desc: "Brand mention rate, citation quality, and sentiment across AI answer engines." },
              { icon: "ðŸŽ¯", title: "Priority Engine", desc: "Every finding scored by Impact Ã— Urgency Ã— Confidence Ã· Effort. No more guessing what to fix first." },
              { icon: "ðŸ“‹", title: "Action Center", desc: "Step-by-step fixes with verification checklists and copy-ready code snippets." },
              { icon: "ðŸ“ˆ", title: "Confidence Bands", desc: "Every claim pinned to evidence. No hallucinations. Uncertainty clearly signalled." },
              { icon: "ðŸ›¡ï¸", title: "Anti-Hallucination", desc: "AI verdicts validated against raw crawl data. Claims without evidence are stripped." },
            ].map(f => (
              <div key={f.title} className="bg-white p-5 rounded-xl border shadow-sm">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-primary mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="py-16 bg-primary text-white px-4">
        <div className="container mx-auto px-4">
          <TrustIndicators />
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <BarChart3 className="w-10 h-10 text-accent mx-auto mb-5" />
          <h2 className="text-3xl font-bold text-primary mb-3">Ready to see where you stand?</h2>
          <p className="text-muted-foreground mb-8">
            Thousands of founders use this audit to find the hidden issues costing them organic traffic.
          </p>
          <UrlInput />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 bg-slate-50 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-primary text-sm">Motion Labs AI</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:text-primary transition">Privacy</a>
            <a href="/terms" className="hover:text-primary transition">Terms</a>
            <a href="mailto:hello@motionlabs.ai" className="hover:text-primary transition">Contact</a>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>GDPR Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
