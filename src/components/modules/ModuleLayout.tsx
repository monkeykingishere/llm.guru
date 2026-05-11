import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function ModuleLayout({
  eyebrow,
  title,
  description,
  prev,
  next,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  prev?: { to: string; label: string };
  next?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[600px] grid-bg pointer-events-none" />

      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-aurora" />
          {eyebrow}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 text-5xl sm:text-6xl font-semibold tracking-tight"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05 }}
          className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed"
        >
          {description}
        </motion.p>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        {children}
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {prev ? (
            <Link
              to={prev.to}
              className="glass rounded-2xl p-5 hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </div>
              <div className="mt-2 text-lg font-medium group-hover:text-gradient">
                {prev.label}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {next && (
            <Link
              to={next.to}
              className="glass rounded-2xl p-5 hover:bg-white/[0.04] transition-colors group text-right sm:col-start-2"
            >
              <div className="flex items-center justify-end gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <div className="mt-2 text-lg font-medium group-hover:text-gradient">
                {next.label}
              </div>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
