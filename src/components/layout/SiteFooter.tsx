import { Link } from "@tanstack/react-router";
import { Brain, Github, Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/5 mt-32">
      <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-aurora grid place-items-center">
                <Brain className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-semibold tracking-tight text-lg">
                Latent
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
              An interactive atlas of how large language models actually work —
              from raw tokens to attention, embeddings, and emergent behavior.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Crafted for curious minds
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Modules
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  to="/learn/tokenization"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Tokenization
                </Link>
              </li>
              <li>
                <Link
                  to="/learn/embeddings"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Embeddings
                </Link>
              </li>
              <li>
                <Link
                  to="/learn/attention"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Attention
                </Link>
              </li>
              <li>
                <Link
                  to="/learn/transformer"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Transformer
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Project
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  to="/curriculum"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Curriculum
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-foreground"
                >
                  <Github className="h-3.5 w-3.5" /> Source
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Latent. All rights reserved.</span>
          <span>Built for understanding, not hype.</span>
        </div>
      </div>
    </footer>
  );
}
