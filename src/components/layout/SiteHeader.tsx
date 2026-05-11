import { Link, useLocation } from "@tanstack/react-router";
import { Brain, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/learn/tokenization", label: "Tokenization" },
  { to: "/learn/embeddings", label: "Embeddings" },
  { to: "/learn/attention", label: "Attention" },
  { to: "/learn/transformer", label: "Transformer" },
  { to: "/curriculum", label: "Curriculum" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500 ${
            scrolled ? "glass-strong" : "bg-transparent"
          }`}
        >
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-aurora rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-9 w-9 rounded-xl bg-aurora flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold tracking-tight text-foreground">
                Latent
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                LLM Atlas
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                pathname === item.to ||
                (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative px-3.5 py-2 text-sm rounded-xl transition-colors ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/learn/tokenization"
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-aurora px-4 py-2 text-sm font-medium text-white shadow-[0_8px_30px_-10px_oklch(0.66_0.21_285/0.8)] hover:shadow-[0_12px_40px_-10px_oklch(0.66_0.21_285/1)] transition-shadow"
            >
              Start learning
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden h-9 w-9 grid place-items-center rounded-xl glass"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden mt-2 glass-strong rounded-2xl p-2"
            >
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
