import { Link, useLocation } from "@tanstack/react-router";
import { Brain, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/learn/introduction", label: "Introduction" },
  { to: "/learn/tokenization", label: "Tokenization" },
  { to: "/learn/embeddings", label: "Embeddings" },
  { to: "/learn/attention", label: "Attention" },
  { to: "/learn/transformer", label: "Transformer" },
  { to: "/curriculum", label: "Curriculum" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const scrolledRef = useRef(false);
  const { pathname } = useLocation();

  useEffect(() => {
    let frame = 0;
    const updateScrolled = () => {
      frame = 0;
      const next = window.scrollY > 12;
      if (next !== scrolledRef.current) {
        scrolledRef.current = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrolled);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[padding] duration-500 ease-[var(--ease-smooth)] ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-[var(--ease-smooth)] ${
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
              {/* <span className="font-semibold tracking-tight text-foreground">
                LLMGuru
              </span> */}
              <span className="text-[15px] uppercase tracking-[0.18em] text-muted-foreground">
                LLMGuru
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative px-3.5 py-2 text-sm rounded-xl transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/10"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 38,
                        mass: 0.8,
                      }}
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
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-aurora px-4 py-2 text-sm font-medium text-white border border-white/5 hover:border-white/20 shadow-md shadow-black/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[var(--ease-smooth)]"
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
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
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
