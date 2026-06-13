import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Brain,
  Binary,
  Telescope,
  ScanLine,
  Network,
  Eye,
  Layers,
  Activity,
  GitBranch,
  Wand2,
  Cpu,
  Sparkles,
  Gauge,
  Goal,
  ShieldCheck,
  Home,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkle,
} from "lucide-react";

// Full sequence of lessons in LLM Guru
const LESSONS = [
  {
    path: "/",
    title: "Home",
    moduleNum: "00",
    icon: Home,
    duration: "1 min",
    desc: "Welcome to LLM Guru curriculum hub.",
  },
  {
    path: "/curriculum",
    title: "Curriculum Map",
    moduleNum: "Map",
    icon: BookOpen,
    duration: "2 min",
    desc: "Explore all 16 modules in order.",
  },
  {
    path: "/learn/introduction",
    title: "Introduction to LLMs",
    moduleNum: "01",
    icon: Brain,
    duration: "5 min",
    desc: "Core concepts of LLMs and self-attention foundations.",
  },
  {
    path: "/learn/tokenization",
    title: "Tokenization",
    moduleNum: "02",
    icon: Binary,
    duration: "8 min",
    desc: "How text is decomposed into discrete mathematical tokens.",
  },
  {
    path: "/learn/embeddings",
    title: "Embeddings",
    moduleNum: "03",
    icon: Telescope,
    duration: "10 min",
    desc: "Semantic geometry: flying through a 3D vector space.",
  },
  {
    path: "/learn/positional-encoding",
    title: "Positional Encoding",
    moduleNum: "04",
    icon: ScanLine,
    duration: "7 min",
    desc: "Teaching sequence order to permutation-invariant models.",
  },
  {
    path: "/learn/neural-network",
    title: "Neural Networks",
    moduleNum: "05",
    icon: Network,
    duration: "12 min",
    desc: "Understanding weights, activations, and dense layers.",
  },
  {
    path: "/learn/vision",
    title: "Vision & Multimodal",
    moduleNum: "06",
    icon: Eye,
    duration: "11 min",
    desc: "Aligning text and image representations in shared space.",
  },
  {
    path: "/learn/transformer",
    title: "Transformer Block",
    moduleNum: "07",
    icon: Layers,
    duration: "15 min",
    desc: "The architecture of layered blocks that changed AI.",
  },
  {
    path: "/learn/attention",
    title: "Attention Lab",
    moduleNum: "08",
    icon: Activity,
    duration: "15 min",
    desc: "Soft, learned routing maps between pairs of tokens.",
  },
  {
    path: "/learn/context-window",
    title: "Context Window",
    moduleNum: "09",
    icon: GitBranch,
    duration: "10 min",
    desc: "Understanding model limits and memory architectures.",
  },
  {
    path: "/learn/prediction",
    title: "Prediction Process",
    moduleNum: "10",
    icon: Wand2,
    duration: "9 min",
    desc: "Watch the step-by-step next token prediction loop.",
  },
  {
    path: "/learn/training-process",
    title: "Training Process",
    moduleNum: "11",
    icon: Cpu,
    duration: "14 min",
    desc: "Gradients, loss landscapes, and optimization loops.",
  },
  {
    path: "/learn/fine-tuning",
    title: "Fine-Tuning",
    moduleNum: "12",
    icon: Sparkles,
    duration: "10 min",
    desc: "Bending pre-trained base weights to specific domains.",
  },
  {
    path: "/learn/scaling",
    title: "Scaling Laws",
    moduleNum: "13",
    icon: Gauge,
    duration: "10 min",
    desc: "Compute, parameters, training tokens, and power laws.",
  },
  {
    path: "/learn/limitations",
    title: "Limitations",
    moduleNum: "14",
    icon: Goal,
    duration: "8 min",
    desc: "Hallucinations, scaling bounds, and structural limits.",
  },
  {
    path: "/learn/safety",
    title: "Safety & Ethics",
    moduleNum: "15",
    icon: ShieldCheck,
    duration: "10 min",
    desc: "Aligning model boundaries and evaluating behaviors.",
  },
  {
    path: "/learn/chess-engine",
    title: "Chess Engine Lab",
    moduleNum: "16",
    icon: GitBranch,
    duration: "15 min",
    desc: "Minimax decisions, game evaluation, and search trees.",
  },
];

export function MobileDynamicIsland() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [prevPath, setPrevPath] = useState(pathname);
  const [isNavigating, setIsNavigating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Gesture coordinate tracking references to prevent scroll conflicts
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Watchdog failsafe lock: resets navigation state after 1000ms if transition hangs
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isNavigating]);

  // Check reduced motion setting
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Sync slide direction when path changes
  useEffect(() => {
    if (pathname !== prevPath) {
      const prevIdx = LESSONS.findIndex((l) => l.path === prevPath);
      const currIdx = LESSONS.findIndex((l) => l.path === pathname);
      if (currIdx > prevIdx) {
        setSlideDir("right");
      } else {
        setSlideDir("left");
      }
      setPrevPath(pathname);
      setIsNavigating(false);
      setIsOpen(false); // Auto-collapse on route transition
    }
  }, [pathname, prevPath]);

  // Find active indices
  const currentIdx = LESSONS.findIndex(
    (l) => pathname === l.path || (l.path !== "/" && pathname.startsWith(l.path))
  );

  // If page is not in curriculum list, don't show the island
  if (currentIdx === -1) return null;

  const currentLesson = LESSONS[currentIdx];
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < LESSONS.length - 1;

  const prevLesson = hasPrev ? LESSONS[currentIdx - 1] : null;
  const nextLesson = hasNext ? LESSONS[currentIdx + 1] : null;

  // Compute progress percentage (exclude Home/Curriculum for active lesson completion count)
  const totalLessons = LESSONS.length - 2; // 16 lessons
  const lessonProgressIndex = currentIdx >= 2 ? currentIdx - 1 : 0;
  const percentCompleted = totalLessons > 0 ? lessonProgressIndex / totalLessons : 0;

  // SVG Progress Ring calculations
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - percentCompleted * circumference;

  const handlePrev = () => {
    if (isNavigating || !hasPrev || !prevLesson) return;
    setIsNavigating(true);
    navigate({ to: prevLesson.path });
  };

  const handleNext = () => {
    if (isNavigating || !hasNext || !nextLesson) return;
    setIsNavigating(true);
    navigate({ to: nextLesson.path });
  };

  // Long press timer cancellations
  const cancelPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  // Pointer event start coordinates tracking
  const handleTouchStart = (e: React.TouchEvent) => {
    isLongPressRef.current = false;
    const touch = e.touches[0];
    if (touch) {
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    }
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsOpen(true);
      if (navigator.vibrate) {
        navigator.vibrate(12); // subtle tactile click feedback
      }
    }, 300);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pressTimerRef.current) {
      const touch = e.touches[0];
      if (touch) {
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        // Cancel if moving more than 8px (indicates dragging or scrolling page)
        if (dx > 8 || dy > 8) {
          cancelPressTimer();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isLongPressRef.current = false;
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsOpen(true);
      if (navigator.vibrate) {
        navigator.vibrate(12);
      }
    }, 300);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (pressTimerRef.current) {
      const dx = Math.abs(e.clientX - touchStartPos.current.x);
      const dy = Math.abs(e.clientY - touchStartPos.current.y);
      if (dx > 8 || dy > 8) {
        cancelPressTimer();
      }
    }
  };

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  // 3D Motion variants orchestrating width and height
  const islandVariants = {
    closed: {
      width: 250,
      height: 48,
      borderRadius: "24px",
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : {
            type: "spring" as const,
            stiffness: 380,
            damping: 30,
            height: { duration: 0.16, ease: "easeOut" as const },
            width: { delay: 0.08, duration: 0.2, ease: "easeOut" as const },
          },
    },
    open: {
      width: 328,
      height: 224,
      borderRadius: "28px",
      y: -8,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : {
            type: "spring" as const,
            stiffness: 350,
            damping: 26,
            width: { duration: 0.22, ease: "easeOut" as const },
            height: { delay: 0.1, duration: 0.22, ease: "easeOut" as const },
          },
    },
  };

  // Orchestrated opacity contents variants preventing squishing
  const closedContentVariants = {
    visible: {
      opacity: 1,
      scale: 1,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { delay: 0.14, duration: 0.14 },
    },
    hidden: {
      opacity: 0,
      scale: 0.95,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.08 },
    },
  };

  const openContentVariants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { delay: 0.16, duration: 0.18 },
    },
    hidden: {
      opacity: 0,
      y: 4,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.08 },
    },
  };

  const slideVariants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 18 : -18,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -18 : 18,
      opacity: 0,
    }),
  };

  const CurrentIcon = currentLesson.icon;

  return (
    <>
      {/* Click Outside Overlay backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1.5px] block md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Floating Island Container with Dynamic Safe Area Bottom Style */}
      <div
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        className="fixed left-1/2 -translate-x-1/2 z-50 block md:hidden pointer-events-none"
      >
        <motion.div
          layout
          variants={islandVariants}
          initial="closed"
          animate={isOpen ? "open" : "closed"}
          whileTap={isOpen ? undefined : { scale: 0.96, transition: { duration: 0.08 } }}
          className="bg-zinc-950/94 backdrop-blur-xl border border-white/10 border-t-white/20 border-b-white/5 shadow-[0_4px_16px_rgba(0,0,0,0.55),0_16px_48px_rgba(0,0,0,0.7)] pointer-events-auto relative overflow-hidden flex flex-col justify-start"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Internal Glow border overlay */}
          <div className="absolute inset-0 rounded-[inherit] border border-white/5 pointer-events-none" />

          {/* CLOSED STATE RENDER (Orchestrated opacity) */}
          <motion.div
            variants={closedContentVariants}
            initial="visible"
            animate={isOpen ? "hidden" : "visible"}
            className={cn(
              "absolute inset-0 flex items-center justify-between px-3 h-full cursor-pointer select-none",
              isOpen ? "pointer-events-none" : ""
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={cancelPressTimer}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={cancelPressTimer}
            drag={isOpen ? false : "x"}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={cancelPressTimer}
            onDragEnd={(event, info) => {
              if (info.offset.x < -60) {
                handleNext();
              } else if (info.offset.x > 60) {
                handlePrev();
              }
            }}
            aria-label={`Current Lesson: ${currentLesson.title}. Hold to expand, swipe left for next module, swipe right for previous module.`}
          >
            {/* Progress Icon Indicator */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative w-8 h-8 flex items-center justify-center bg-white/[0.04] rounded-full shrink-0">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="16"
                    cy="16"
                    r={radius}
                    className="stroke-white/10"
                    strokeWidth="1.5"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="16"
                    cy="16"
                    r={radius}
                    className="stroke-emerald-400"
                    strokeWidth="1.8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </svg>
                <CurrentIcon className="h-3.5 w-3.5 text-white/95 relative z-10" />
              </div>

              {/* Lesson Info block (sliding on route transitions) */}
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider font-semibold">
                  {currentLesson.moduleNum ? `Module ${currentLesson.moduleNum}` : "Curriculum"}
                </span>
                <div className="overflow-hidden">
                  <AnimatePresence mode="popLayout" custom={slideDir}>
                    <motion.span
                      key={pathname}
                      custom={slideDir}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="text-xs font-semibold text-white/90 truncate block max-w-[130px]"
                    >
                      {currentLesson.title}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Lesson Counter label */}
            <div className="text-[10px] font-mono bg-white/5 border border-white/5 text-muted-foreground px-2 py-0.5 rounded-full select-none shrink-0 font-bold">
              {currentIdx >= 2 ? `${lessonProgressIndex}/${totalLessons}` : "Guru"}
            </div>
          </motion.div>

          {/* OPENED STATE RENDER (Orchestrated opacity) */}
          <motion.div
            variants={openContentVariants}
            initial="hidden"
            animate={isOpen ? "visible" : "hidden"}
            className={cn(
              "w-full h-full flex flex-col p-4 select-none justify-between",
              !isOpen ? "pointer-events-none" : ""
            )}
          >
            {/* Header Navigator Row */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className="p-1.5 hover:bg-white/5 disabled:opacity-30 rounded-lg text-white transition-colors cursor-pointer"
                aria-label="Previous lesson"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  Lesson {currentIdx + 1} of {LESSONS.length}
                </span>
                <span className="text-xs font-bold text-white truncate max-w-[180px]">
                  {currentLesson.title}
                </span>
              </div>

              <button
                onClick={handleNext}
                disabled={!hasNext}
                className="p-1.5 hover:bg-white/5 disabled:opacity-30 rounded-lg text-white transition-colors cursor-pointer"
                aria-label="Next lesson"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Neighboring Preview Area */}
            <div className="flex-1 flex flex-col justify-center py-2.5 min-h-0">
              {hasNext && nextLesson ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-semibold tracking-wide uppercase">
                    <Sparkle className="h-3 w-3 animate-pulse" />
                    <span>Next Module Preview</span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-start gap-2.5">
                    <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                      {(() => {
                        const NextIcon = nextLesson.icon;
                        return <NextIcon className="h-4 w-4 text-emerald-300" />;
                      })()}
                    </div>

                    <div className="min-w-0 flex-1 leading-tight space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[11px] font-semibold text-white truncate">
                          {nextLesson.title}
                        </h4>
                        <span className="text-[9px] text-muted-foreground font-mono shrink-0 font-bold">
                          {nextLesson.duration}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">
                        {nextLesson.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 space-y-1">
                  <div className="inline-flex h-8 w-8 rounded-full bg-emerald-500/20 items-center justify-center text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <h4 className="text-[11px] font-bold text-white tracking-wide uppercase">
                    Course Completed!
                  </h4>
                  <p className="text-[10px] text-muted-foreground max-w-[240px] mx-auto leading-normal">
                    Amazing! You have explored every module in LLM Guru. Check back soon for updates.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Instructions or Direct Action CTA */}
            <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground border-t border-white/5 pt-2">
              <span>Swipe closed pill left/right</span>
              {hasNext && nextLesson ? (
                <button
                  onClick={handleNext}
                  className="text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                >
                  Start Lesson <ChevronRight className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={() => navigate({ to: "/curriculum" })}
                  className="text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                >
                  View Map <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
