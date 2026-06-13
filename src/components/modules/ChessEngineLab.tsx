import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Award,
  Lock,
  Zap,
  Sliders,
  ChevronRight,
  ChevronDown,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Sparkles,
  Search,
  Percent,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import {
  parseFen,
  stateToFen,
  getLegalMoves,
  makeMove,
  evaluatePosition,
  runEngineSearch,
  PRESETS,
  indexToSqName,
  Color,
  Move,
  SearchTreeNode,
  SearchEvent,
  STARTING_FEN,
  isInCheck,
} from "@/lib/chess/ChessEngine";
import { cn } from "@/lib/utils";

// ----------------------------------------------------
// Beautiful Modern SVG Chess Pieces Component
// ----------------------------------------------------
const ChessPiece: React.FC<{ type: string; color: Color; className?: string }> = ({
  type,
  color,
  className,
}) => {
  const isWhite = color === "w";
  const fillColor = isWhite ? "#f8fafc" : "#0f172a";
  const strokeColor = isWhite ? "#475569" : "#cbd5e1";

  switch (type) {
    case "p":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83.67-1.41 1.67-1.41 2.82v1h11v-1c0-1.15-.58-2.15-1.41-2.82 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M15 32.5h15v2H15z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );
    case "n":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,21 16,20 C 18,19 20,20 20,20 C 20,20 17,22 15,25 C 13,28 13,31 13,31 C 13,31 15,30 18,28 C 19,30 22,30 22,30 C 22,30 20,32 18,34 C 16,36 16,37 16,37 L 29,37 C 29,37 31,34 30,30 C 29,26 27,22 27,22 C 27,22 28,19 28,15 C 28,11 25,10 22,10 z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="16" r="2" fill={isWhite ? "#475569" : "#cbd5e1"} />
          <path d="M 14,39 L 31,39" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "b":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M9 36c3.39 0 7.66-.69 11.5-2.33 3.84 1.64 8.11 2.33 11.5 2.33 1.5 0 2.5-.3 2.5-.75V33H11v2.25c0 .45 1 .75 2.5.75z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <path
            d="M15 31V28.5c0-2 1.5-4.5 3-5.5 1.5-1 3-3.5 3-5.5 0-2.5-1.5-4.5-3.5-5C19.5 11 22.5 8 22.5 8s3 3 5 4.5c-2 .5-3.5 2.5-3.5 5 0 2 1.5 4.5 3 5.5 1.5 1 3 3.5 3 5.5V31H15z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="22.5" cy="6" r="1.5" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
          <path d="M17.5 18h10M22.5 14v8" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );
    case "r":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M9 39h27v-3H9v3zm3-13h21v-4H12v4zm2.5-4l1.5-8h18l1.5 8h-21z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 12v4h4v-4h3v4h7v-4h3v4h4v-4h3v-3H9v3h3z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M11 36h23v-3H11v3z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );
    case "q":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M9 26c1.65 0 3 1.2 4.9 3.5 1.9-2.3 3.25-3.5 4.9-3.5s3 1.2 4.9 3.5c1.9-2.3 3.25-3.5 4.9-3.5s3 1.2 4.9 3.5c1.9-2.3 3.25-3.5 4.9-3.5V12L34.5 20 22.5 8 10.5 20 6 12v14h3z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M6 37h33v-3H6v3z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="6" cy="12" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
          <circle cx="10.5" cy="20" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
          <circle cx="22.5" cy="8" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
          <circle cx="34.5" cy="20" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
          <circle cx="39" cy="12" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        </svg>
      );
    case "k":
      return (
        <svg viewBox="0 0 45 45" className={cn("w-full h-full drop-shadow-md", className)}>
          <path
            d="M22.5 11.63V6M20 8h5M22.5 25c2.4 0 5-2 5-6 0-3.5-3-5.5-5-5.5s-5 2-5 5.5c0 4 2.6 6 5 6z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 30c1.5-1.5 4-2.5 6-3h10c2 .5 4.5 1.5 6 3 .75.75 1.5.75 1.5 0V20H10v10c0 .75.75.75 1.5 0z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M11.5 33h22v-3h-22v3zm-2 4h26v-3h-26v3z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
};

// ----------------------------------------------------
// Static Lesson Data
// ----------------------------------------------------
interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  interactiveTips: string;
}

const LESSONS: Lesson[] = [
  {
    id: "minimax",
    title: "1. Minimax Fundamentals",
    subtitle: "Assuming optimal opponent play",
    content: "Minimax is the foundational search algorithm for chess engines. White wants to maximize the score, while Black wants to minimize it. When calculating moves, the engine does not just look at its own opportunities; it assumes the opponent will make the strongest possible response. By searching ahead and propagating leaf evaluations back up, the engine decides the mathematically optimal move.",
    interactiveTips: "Click 'Show Engine Thinking' to watch white and black alternates, and see scores bubble up to the root."
  },
  {
    id: "evaluation",
    title: "2. Evaluation Functions",
    subtitle: "Quantifying board features",
    content: "At the leaves of the search tree, the engine uses an Evaluation Function to convert a board position into a single numerical score. A score of +1.5 means White is ahead by the equivalent of 1.5 pawns. It sums material values (Pawns=1.0, Knights=3.2, etc.) and positional bonuses from Piece-Square Tables (PST), rewarding central control, king safety, and active pieces.",
    interactiveTips: "Move a piece on the board and look at the 'Current Evaluation' in the right panel to see it update instantly."
  },
  {
    id: "alphabeta",
    title: "3. Alpha-Beta Pruning",
    subtitle: "Skipping irrelevant branches",
    content: "In pure Minimax, searching depth 6 requires looking at millions of nodes. Alpha-Beta Pruning speeds this up dramatically by keeping track of two values: Alpha (the best score the Maximizer is guaranteed) and Beta (the best score the Minimizer is guaranteed). If a branch's evaluation drops below Alpha or exceeds Beta, the engine skips searching the remaining replies. It is mathematically proven to yield the same result but up to 10x faster.",
    interactiveTips: "Toggle 'Alpha-Beta Pruning' on and off, then click 'Show Engine Thinking'. Watch locked branches fade away."
  },
  {
    id: "pv",
    title: "4. Principal Variation (PV)",
    subtitle: "The path of best play",
    content: "The Principal Variation (PV) is the sequence of best moves calculated by the engine for both sides. It represents what the engine expects will happen if both sides play optimally. In the UI, the PV is highlighted as the primary golden branch, illustrating the main battle line.",
    interactiveTips: "Turn on the 'Highlight PV' toggle. Hovering over nodes on the PV shows the predicted sequence of moves."
  },
  {
    id: "depth",
    title: "5. Search Depth",
    subtitle: "The horizon problem",
    content: "Chess engines search a tree of candidate moves. The depth represents how many turns (plies) ahead the engine looks. A depth of 4 means White move, Black reply, White move, Black reply. Due to exponential growth (approx. 35 moves per position), each extra depth level takes ~35x longer. Top engines manage search depth via iterative deepening.",
    interactiveTips: "Slide the depth selector from 1 to 5. Notice the node count in the Telemetry section increase exponentially."
  },
  {
    id: "tradeoffs",
    title: "6. Engine Trade-Offs",
    subtitle: "Depth vs. Heuristic accuracy",
    content: "An engine must strike a balance: should it evaluate positions quickly using basic rules to search deeper (e.g. depth 12), or evaluate positions in extreme detail (material, pawn structures, king safe zones) but search shallower (e.g. depth 6)? Modern engines use highly optimized C/C++ architectures and bitboards to achieve both.",
    interactiveTips: "Click presets like 'World Championship' and adjust depth. See how the engine's calculation speed shifts."
  },
  {
    id: "modern",
    title: "7. Modern Architecture",
    subtitle: "Speed hacks and optimizations",
    content: "Modern engines like Stockfish do not just run plain Alpha-Beta. They use: 1) Transposition Tables (caching previously searched positions), 2) Quiescence Search (extending the search depth during captures to avoid blunders), and 3) Move Ordering (searching captures first to trigger pruning early).",
    interactiveTips: "Notice how capturing moves (like 'x' in SAN) are evaluated first in the search tree list."
  },
  {
    id: "nnue",
    title: "8. Neural Networks (NNUE)",
    subtitle: "Deep learning on CPU",
    content: "In 2020, Stockfish integrated NNUE (Efficiently Updatable Neural Network). Instead of hand-written positional rules, a shallow neural network runs on the CPU, directly evaluating the board based on piece coordinates. This combined the brute-force search depth of traditional engines with the deep positional understanding of deep learning models like AlphaZero.",
    interactiveTips: "Read how neural networks evaluate millions of shapes instantly, forming the absolute state-of-the-art in chess."
  }
];

export const ChessEngineLab: React.FC = () => {
  // ----------------------------------------------------
  // State variables
  // ----------------------------------------------------
  const [activeTab, setActiveTab] = useState<"lab" | "curriculum">("lab");
  const [boardState, setBoardState] = useState(parseFen(STARTING_FEN));
  const [selectedPreset, setSelectedPreset] = useState("Opening Position");
  const [selectedSq, setSelectedSq] = useState<number | null>(null);
  
  // Search parameters
  const [depth, setDepth] = useState(3);
  const [enableAlphaBeta, setEnableAlphaBeta] = useState(true);
  const [highlightPV, setHighlightPV] = useState(true);
  
  // Playback & Thinking Animation state
  const [searchResult, setSearchResult] = useState(() =>
    runEngineSearch(parseFen(STARTING_FEN), 3, true)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIdx, setPlaybackIdx] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(300); // ms per step
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [prunedNodes, setPrunedNodes] = useState<Map<string, string[]>>(new Map());
  const [activeScores, setActiveScores] = useState<Map<string, number>>(new Map());
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  // Tree View State
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Zoom / Pan State for SVG Tree
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [zoom, setZoom] = useState(0.85);
  const isDraggingTree = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Curriculum Lesson progress
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chess_lessons_progress");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  const [activeLessonId, setActiveLessonId] = useState("minimax");

  // Telemetry estimates
  const [estimatedNps, setEstimatedNps] = useState(12500);

  // ----------------------------------------------------
  // Derived state
  // ----------------------------------------------------
  const legalMoves = useMemo(() => getLegalMoves(boardState), [boardState]);
  
  // Create mapping of legal moves from squares for easy board highlights
  const legalMoveTargets = useMemo(() => {
    if (selectedSq === null) return [];
    return legalMoves.filter((m) => m.from === selectedSq).map((m) => m.to);
  }, [selectedSq, legalMoves]);

  // Tree layout spacing
  const spacingX = 200;
  const spacingY = 70;

  // Tree layout computation
  const treeLayout = useMemo(() => {
    const root = searchResult.tree;
    const nodes: {
      node: SearchTreeNode;
      x: number;
      y: number;
      isExpanded: boolean;
      parentPos?: { x: number; y: number };
    }[] = [];
    const links: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      pruned: boolean;
      id: string;
    }[] = [];
    const positions = new Map<string, { x: number; y: number }>();
    
    let currentY = 0;

    // Helper to traverse tree and count height
    function traverse(n: SearchTreeNode, d: number) {
      // Root is always expanded, others depend on state or are forced open during thinking
      const isForceExpanded = isPlaying && playbackIdx >= 0 && n.id === currentNodeId;
      const isExpanded = expandedNodes.has(n.id) || d === 0 || isForceExpanded;
      const hasVisibleChildren = isExpanded && n.children.length > 0;

      if (!hasVisibleChildren) {
        const x = d * spacingX + 40;
        const y = currentY;
        positions.set(n.id, { x, y });
        currentY += spacingY;
        return;
      }

      for (const child of n.children) {
        traverse(child, d + 1);
      }

      const x = d * spacingX + 40;
      const childYCoords = n.children
        .map((c) => positions.get(c.id)?.y)
        .filter((y): y is number => y !== undefined);
      
      const y = childYCoords.length > 0
        ? childYCoords.reduce((sum, cy) => sum + cy, 0) / childYCoords.length
        : currentY;
      
      positions.set(n.id, { x, y });
    }

    traverse(root, 0);

    // Helper to build list of visible layout nodes and connections
    function collect(n: SearchTreeNode, d: number, parentPos?: { x: number; y: number }) {
      const pos = positions.get(n.id);
      if (!pos) return;

      const isForceExpanded = isPlaying && playbackIdx >= 0 && n.id === currentNodeId;
      const isExpanded = expandedNodes.has(n.id) || d === 0 || isForceExpanded;

      nodes.push({
        node: n,
        x: pos.x,
        y: pos.y,
        isExpanded,
        parentPos,
      });

      if (parentPos) {
        links.push({
          from: parentPos,
          to: pos,
          pruned: n.pruned,
          id: `${n.id}-link`,
        });
      }

      if (isExpanded && n.children.length > 0) {
        for (const child of n.children) {
          collect(child, d + 1, pos);
        }
      }
    }

    collect(root, 0);

    return { nodes, links };
  }, [searchResult, expandedNodes, isPlaying, playbackIdx, currentNodeId]);

  // Recalculate search result when depth, alpha-beta, or board changes
  useEffect(() => {
    // Prevent searches if playing thinking animation
    if (!isPlaying) {
      const res = runEngineSearch(boardState, depth, enableAlphaBeta);
      setSearchResult(res);
      // Reset animations
      setPlaybackIdx(-1);
      setVisitedNodes(new Set());
      setPrunedNodes(new Map());
      setActiveScores(new Map());
      setCurrentNodeId(null);
      // Reset expansion - open root children
      const initialSet = new Set<string>();
      initialSet.add("root");
      setExpandedNodes(initialSet);
    }
  }, [boardState, depth, enableAlphaBeta]);

  // Playback timer tick
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPlaybackIdx((prevIdx) => {
        const nextIdx = prevIdx + 1;
        const events = searchResult.events;
        
        if (nextIdx >= events.length) {
          setIsPlaying(false);
          return prevIdx; // stop at end
        }

        const ev = events[nextIdx];
        setCurrentNodeId(ev.nodeId);

        // Auto expand parent nodes so user can see what's being evaluated
        if (ev.nodeId !== "root") {
          const parts = ev.nodeId.replace("node-", "").split("-");
          for (let i = 1; i <= parts.length; i++) {
            const parentId = `node-${parts.slice(0, i).join("-")}`;
            setExpandedNodes((prev) => {
              const nextSet = new Set(prev);
              nextSet.add(parentId);
              return nextSet;
            });
          }
        }

        if (ev.type === "visit") {
          setVisitedNodes((prev) => {
            const nextSet = new Set(prev);
            nextSet.add(ev.nodeId);
            return nextSet;
          });
        } else if (ev.type === "evaluate") {
          if (ev.evaluation !== undefined) {
            setActiveScores((prev) => {
              const nextMap = new Map(prev);
              nextMap.set(ev.nodeId, ev.evaluation!);
              return nextMap;
            });
          }
        } else if (ev.type === "prune") {
          setPrunedNodes((prev) => {
            const nextMap = new Map(prev);
            nextMap.set(ev.nodeId, ev.prunedMoves || []);
            return nextMap;
          });
        } else if (ev.type === "update") {
          if (ev.evaluation !== undefined) {
            setActiveScores((prev) => {
              const nextMap = new Map(prev);
              nextMap.set(ev.nodeId, ev.evaluation!);
              return nextMap;
            });
          }
        }

        return nextIdx;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, searchResult, playbackSpeed]);

  // Nodes per second visual variations
  useEffect(() => {
    const interval = setInterval(() => {
      setEstimatedNps((prev) => {
        const offset = Math.floor((Math.random() - 0.5) * 800);
        return Math.max(8000, Math.min(18000, prev + offset));
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // ----------------------------------------------------
  // Click Handlers
  // ----------------------------------------------------
  const handleSqClick = (sq: number) => {
    // If playing, ignore moves
    if (isPlaying) return;

    if (selectedSq === null) {
      const piece = boardState.board[sq];
      if (piece && piece.color === boardState.turn) {
        setSelectedSq(sq);
      }
    } else {
      // If click same square, deselect
      if (selectedSq === sq) {
        setSelectedSq(null);
        return;
      }

      // Check if clicked target is a legal move
      const matchingMove = legalMoves.find((m) => m.from === selectedSq && m.to === sq);
      if (matchingMove) {
        const nextState = makeMove(boardState, matchingMove);
        setBoardState(nextState);
        setSelectedSq(null);
      } else {
        // Otherwise, see if clicked another own piece to select
        const piece = boardState.board[sq];
        if (piece && piece.color === boardState.turn) {
          setSelectedSq(sq);
        } else {
          setSelectedSq(null);
        }
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPlaybackIdx(-1);
    setBoardState(parseFen(STARTING_FEN));
    setSelectedPreset("Opening Position");
    setSelectedSq(null);
  };

  const handlePresetChange = (presetName: string) => {
    setIsPlaying(false);
    setPlaybackIdx(-1);
    const p = PRESETS.find((x) => x.name === presetName);
    if (p) {
      setSelectedPreset(presetName);
      setBoardState(parseFen(p.fen));
      setSelectedSq(null);
    }
  };

  const handleStartThinking = () => {
    // Reset thinking animation states
    setPlaybackIdx(-1);
    setVisitedNodes(new Set());
    setPrunedNodes(new Map());
    setActiveScores(new Map());
    setCurrentNodeId(null);
    
    // Force expand root children
    const rootSet = new Set<string>();
    rootSet.add("root");
    setExpandedNodes(rootSet);

    // Compute fresh search trace
    const res = runEngineSearch(boardState, depth, enableAlphaBeta);
    setSearchResult(res);

    setIsPlaying(true);
  };

  // Zoom and pan logic for tree SVG
  const handleTreeMouseDown = (e: React.MouseEvent) => {
    isDraggingTree.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleTreeMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTree.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleTreeMouseUp = () => {
    isDraggingTree.current = false;
  };

  const handleTreeTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingTree.current = true;
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
    }
  };

  const handleTreeTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingTree.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y,
    });
  };

  const handleTreeTouchEnd = () => {
    isDraggingTree.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 0.03;
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom((z) => Math.max(0.4, Math.min(2, z + direction * zoomFactor)));
  };

  const handleZoom = (amount: number) => {
    setZoom((z) => Math.max(0.4, Math.min(2, z + amount)));
  };

  const handleResetZoom = () => {
    setPan({ x: 40, y: 30 });
    setZoom(0.85);
  };

  // Toggle Lesson completion
  const handleToggleLesson = (lessonId: string) => {
    const nextSet = new Set(completedLessons);
    if (nextSet.has(lessonId)) {
      nextSet.delete(lessonId);
    } else {
      nextSet.add(lessonId);
    }
    setCompletedLessons(nextSet);
    localStorage.setItem("chess_lessons_progress", JSON.stringify(Array.from(nextSet)));
  };

  // Trigger interactive settings from lessons
  const triggerLessonAction = (lessonId: string) => {
    if (lessonId === "alphabeta") {
      setEnableAlphaBeta(true);
    } else if (lessonId === "pv") {
      setHighlightPV(true);
    } else if (lessonId === "depth") {
      setDepth(4);
    }
  };

  // ----------------------------------------------------
  // Board Hover / Selection FEN Preview
  // ----------------------------------------------------
  // If user hovers a node, show that FEN position on board
  const previewBoardState = useMemo(() => {
    let activeId = hoverNodeId || selectedNodeId || currentNodeId;
    if (activeId) {
      // Find node FEN in search tree
      const findNode = (n: SearchTreeNode): SearchTreeNode | null => {
        if (n.id === activeId) return n;
        for (const c of n.children) {
          const res = findNode(c);
          if (res) return res;
        }
        return null;
      };
      const node = findNode(searchResult.tree);
      if (node && node.fen) {
        return parseFen(node.fen);
      }
    }
    return boardState;
  }, [boardState, hoverNodeId, selectedNodeId, currentNodeId, searchResult]);

  // Find hovered node details for tooltip explanation
  const hoveredNode = useMemo(() => {
    if (!hoverNodeId) return null;
    const findNode = (n: SearchTreeNode): SearchTreeNode | null => {
      if (n.id === hoverNodeId) return n;
      for (const c of n.children) {
        const res = findNode(c);
        if (res) return res;
      }
      return null;
    };
    return findNode(searchResult.tree);
  }, [hoverNodeId, searchResult]);

  // Checkmate / Stalemate detection for Game Over overlay
  const isGameOver = useMemo(() => {
    if (legalMoves.length > 0) return null;
    const inCheck = isInCheck(boardState, boardState.turn);
    if (inCheck) {
      return { type: "checkmate", winner: boardState.turn === "w" ? "Black" : "White" };
    } else {
      return { type: "stalemate" };
    }
  }, [boardState, legalMoves]);

  return (
    <div className="w-full">
      {/* Tab Navigation header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("lab")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
              activeTab === "lab"
                ? "bg-white/10 text-white border border-white/10 shadow-lg"
                : "text-muted-foreground hover:text-white border border-transparent"
            )}
          >
            <Sliders className="h-4 w-4 text-amber-400" />
            Interactive Lab
          </button>
          <button
            onClick={() => setActiveTab("curriculum")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
              activeTab === "curriculum"
                ? "bg-white/10 text-white border border-white/10 shadow-lg"
                : "text-muted-foreground hover:text-white border border-transparent"
            )}
          >
            <BookOpen className="h-4 w-4 text-emerald-400" />
            Curriculum Lessons
            {completedLessons.size > 0 && (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {completedLessons.size}/8
              </span>
            )}
          </button>
        </div>
        
        {/* Preset dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-widest hidden sm:inline">
            Position:
          </span>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            disabled={isPlaying}
            className="glass px-3 py-1.5 rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[200px] sm:max-w-none"
          >
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name} className="bg-neutral-900 text-foreground">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "lab" ? (
          <motion.div
            key="lab-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[380px,1fr,320px] gap-6"
          >
            {/* ---------------------------------------------------- */}
            {/* LEFT PANEL: CHESSBOARD & CONTROLS */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-6 h-full flex flex-col order-1 col-span-1">
              <div className="glass-strong rounded-3xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse-glow" />
                    Interactive Chessboard
                  </div>
                  {(hoverNodeId || selectedNodeId || (isPlaying && currentNodeId)) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] animate-pulse">
                      Previewing State
                    </span>
                  )}
                </div>

                {/* Premium Board Grid */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/5 bg-slate-900 ring-1 ring-white/10">
                  <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                    {Array.from({ length: 64 }).map((_, sqIndex) => {
                      const row = Math.floor(sqIndex / 8);
                      const col = sqIndex % 8;
                      const isDark = (row + col) % 2 === 1;
                      const piece = previewBoardState.board[sqIndex];
                      const isSelected = selectedSq === sqIndex;
                      const isTarget = legalMoveTargets.includes(sqIndex);
                      
                      // Check indicators
                      const isKingInCheck =
                        piece && piece.type === "k" && isInCheck(previewBoardState, piece.color);

                      return (
                        <div
                          key={sqIndex}
                          onClick={() => handleSqClick(sqIndex)}
                          className={cn(
                            "relative aspect-square flex items-center justify-center cursor-pointer transition-colors duration-200 select-none",
                            isDark ? "bg-slate-800/80" : "bg-slate-300/10",
                            isSelected && "bg-amber-500/40 ring-2 ring-amber-500 inset-0",
                            isTarget && "after:content-[''] after:w-3 after:h-3 after:rounded-full after:bg-emerald-500/70 hover:bg-emerald-500/20",
                            isKingInCheck && "bg-rose-500/40 shadow-inner"
                          )}
                        >
                          {piece && (
                            <ChessPiece
                              type={piece.type}
                              color={piece.color}
                              className={cn(
                                "w-4/5 h-4/5 transition-transform duration-300 hover:scale-105 active:scale-95",
                                isPlaying && "opacity-90"
                              )}
                            />
                          )}

                          {/* Coordinates */}
                          {col === 0 && (
                            <span className="absolute left-1 top-0.5 text-[8px] font-mono text-muted-foreground select-none">
                              {8 - row}
                            </span>
                          )}
                          {row === 7 && (
                            <span className="absolute right-1 bottom-0.5 text-[8px] font-mono text-muted-foreground select-none">
                              {String.fromCharCode(97 + col)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Game Over Banner Overlay */}
                  {isGameOver && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-10">
                      <Award className="h-10 w-10 text-amber-400 mb-2 animate-bounce" />
                      <h3 className="text-xl font-bold text-white uppercase tracking-wider">
                        {isGameOver.type === "checkmate" ? "Checkmate!" : "Draw!"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        {isGameOver.type === "checkmate"
                          ? `${isGameOver.winner} wins the game.`
                          : "Stalemate - no legal moves available."}
                      </p>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Play Again
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Turn: {boardState.turn === "w" ? "White" : "Black"}</span>
                  <span>FEN: {stateToFen(boardState).slice(0, 26)}...</span>
                </div>
              </div>

              {/* Board Controls Card */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-5 flex-1 flex flex-col">
                <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em]">
                  Engine Controller
                </div>

                {/* Depth Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Search Depth</span>
                    <span className="font-semibold text-amber-400 font-mono">
                      Depth {depth} <span className="text-[10px] text-muted-foreground">(D-{depth})</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    disabled={isPlaying}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                    <span>Quick (1)</span>
                    <span>Standard (3)</span>
                    <span>Deep (6)</span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                      <Zap className="h-3.5 w-3.5 text-blue-400" />
                      Alpha-Beta Pruning
                    </label>
                    <button
                      onClick={() => setEnableAlphaBeta(!enableAlphaBeta)}
                      disabled={isPlaying}
                      className={cn(
                        "w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none",
                        enableAlphaBeta ? "bg-amber-500" : "bg-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full bg-slate-900 transition-transform duration-300",
                          enableAlphaBeta ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                      <Maximize2 className="h-3.5 w-3.5 text-yellow-400" />
                      Highlight PV Line
                    </label>
                    <button
                      onClick={() => setHighlightPV(!highlightPV)}
                      className={cn(
                        "w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none",
                        highlightPV ? "bg-amber-500" : "bg-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full bg-slate-900 transition-transform duration-300",
                          highlightPV ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Play / Thinking Controls */}
                <div className="space-y-3 pt-3 border-t border-white/5 mt-auto">
                  <div className="flex gap-2">
                    <button
                      onClick={handleStartThinking}
                      disabled={isPlaying}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-white/5 disabled:to-white/5 disabled:text-muted-foreground text-slate-950 font-medium text-xs rounded-xl shadow-lg shadow-amber-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="h-4 w-4 fill-slate-950" />
                      Show Engine Thinking
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl active:scale-[0.98] transition-all flex items-center justify-center"
                      title="Reset Board"
                    >
                      <RotateCcw className="h-4 w-4 text-muted-foreground hover:text-white" />
                    </button>
                  </div>

                  {isPlaying && (
                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 space-y-2 animate-pulse">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-mono">Step:</span>
                        <span className="font-semibold text-amber-400 font-mono">
                          {playbackIdx + 1} / {searchResult.events.length}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${((playbackIdx + 1) / searchResult.events.length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <button
                          onClick={() => setIsPlaying(false)}
                          className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded flex items-center gap-1 font-mono text-muted-foreground hover:text-white"
                        >
                          <Pause className="h-2.5 w-2.5" /> Pause
                        </button>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground font-mono">Speed:</span>
                          <input
                            type="range"
                            min="50"
                            max="800"
                            step="50"
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                            className="w-16 h-1 accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isPlaying && playbackIdx >= 0 && (
                    <div className="flex items-center justify-between bg-slate-950/40 border border-white/5 rounded-xl p-3">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Thinking complete
                      </span>
                      <button
                        onClick={handleStartThinking}
                        className="text-[10px] px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded flex items-center gap-1 font-mono"
                      >
                        <Play className="h-2.5 w-2.5" /> Replay
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* CENTER PANEL: INTERACTIVE SEARCH TREE (HERO) */}
            {/* ---------------------------------------------------- */}
            <div className="glass-strong rounded-3xl border border-white/10 relative overflow-hidden flex flex-col h-full min-h-[650px] min-w-0 order-3 md:order-3 lg:order-2 md:col-span-2 lg:col-span-1">
              {/* Toolbar */}
              <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
                <div className="glass px-3 py-1.5 rounded-xl text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pointer-events-auto">
                  <MousePointer className="h-3.5 w-3.5 text-amber-400" />
                  Drag to pan · Scroll to zoom
                </div>
                <div className="flex gap-1.5 pointer-events-auto">
                  <button
                    onClick={() => handleZoom(0.1)}
                    className="h-8 w-8 glass hover:bg-white/10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleZoom(-0.1)}
                    className="h-8 w-8 glass hover:bg-white/10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 glass hover:bg-white/10 rounded-xl text-[10px] font-mono text-muted-foreground hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Tree Canvas SVG Wrapper */}
              <div
                className="w-full flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative select-none"
                onMouseDown={handleTreeMouseDown}
                onMouseMove={handleTreeMouseMove}
                onMouseUp={handleTreeMouseUp}
                onMouseLeave={handleTreeMouseUp}
                onTouchStart={handleTreeTouchStart}
                onTouchMove={handleTreeTouchMove}
                onTouchEnd={handleTreeTouchEnd}
                onWheel={handleWheel}
              >
                <div
                  className="absolute origin-top-left transition-transform duration-100 ease-out"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                >
                  <svg className="overflow-visible" width="3000" height="2000">
                    <g>
                      {/* Connection Links */}
                      {treeLayout.links.map((link) => {
                        const { from, to, pruned, id } = link;
                        
                        // Curved path calculation
                        const cx1 = (from.x + to.x) / 2;
                        const cy1 = from.y;
                        const cx2 = (from.x + to.x) / 2;
                        const cy2 = to.y;
                        
                        const pathData = `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;

                        // Highlights
                        const isPV = highlightPV && to.x <= (searchResult.bestMove ? 500 : 0); // basic PV highlight rule
                        const isVisited = visitedNodes.has(to.x + "-" + to.y); // simplified

                        return (
                          <g key={id}>
                            <path
                              d={pathData}
                              fill="none"
                              stroke={
                                pruned
                                  ? "rgba(239, 68, 68, 0.12)"
                                  : isPV
                                  ? "rgba(245, 158, 11, 0.4)"
                                  : "rgba(255, 255, 255, 0.06)"
                              }
                              strokeWidth={isPV ? 2.5 : 1.5}
                              className="transition-colors duration-300"
                            />
                            {isPV && (
                              <path
                                d={pathData}
                                fill="none"
                                stroke="rgba(245, 158, 11, 0.15)"
                                strokeWidth={6}
                                className="blur-sm"
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* Tree Nodes */}
                      {treeLayout.nodes.map((layoutNode) => {
                        const { node, x, y, isExpanded } = layoutNode;
                        const isRoot = node.id === "root";
                        
                        // Color styling depending on state
                        const isBest = node.isBest;
                        const isPruned = node.pruned;
                        const isVisited = visitedNodes.has(node.id);
                        const isActive = currentNodeId === node.id;
                        const isHovered = hoverNodeId === node.id;
                        const isSelected = selectedNodeId === node.id;

                        let ringColor = "border-white/10 bg-slate-900/90";
                        let textColor = "text-white/80";
                        
                        if (isRoot) {
                          ringColor = "border-white/20 bg-slate-950 ring-1 ring-white/10";
                        } else if (isActive) {
                          ringColor = "border-amber-400 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-amber-950/20";
                          textColor = "text-amber-300 font-bold";
                        } else if (isBest) {
                          ringColor = "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30";
                        } else if (isPruned) {
                          ringColor = "border-rose-950/40 bg-rose-950/5 opacity-40";
                        } else if (isVisited) {
                          ringColor = "border-blue-500/40 bg-blue-500/5";
                        }

                        if (isSelected) {
                          ringColor = "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500";
                        }

                        return (
                          <g key={node.id} transform={`translate(${x}, ${y})`}>
                            {/* Interactive node container (foreignObject lets us render React HTML inside SVG) */}
                            <foreignObject
                              x="-65"
                              y="-28"
                              width="130"
                              height="56"
                              className="overflow-visible"
                            >
                              <div
                                onMouseEnter={() => setHoverNodeId(node.id)}
                                onMouseLeave={() => setHoverNodeId(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Clicking a node selects it (board previews it)
                                  setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
                                  
                                  // Double click or shift-click to toggle expansion
                                  setExpandedNodes((prev) => {
                                    const nextSet = new Set(prev);
                                    if (nextSet.has(node.id)) {
                                      nextSet.delete(node.id);
                                    } else {
                                      nextSet.add(node.id);
                                    }
                                    return nextSet;
                                  });
                                }}
                                className={cn(
                                  "w-full h-full rounded-xl border p-2 flex flex-col justify-between transition-all duration-300 backdrop-blur-md cursor-pointer select-none",
                                  ringColor
                                )}
                              >
                                <div className="flex justify-between items-center">
                                  <span className={cn("text-xs font-mono tracking-tight", textColor)}>
                                    {node.move}
                                  </span>
                                  {isPruned && (
                                    <Lock className="h-2.5 w-2.5 text-rose-400" />
                                  )}
                                  {isBest && !isPruned && (
                                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded uppercase font-bold tracking-wider">
                                      Best
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex justify-between items-baseline mt-1">
                                  <span className="text-[9px] text-muted-foreground font-mono">
                                    {isPruned ? (
                                      <span className="text-rose-500">Pruned</span>
                                    ) : (
                                      <>
                                        Eval:{" "}
                                        <span className={cn(
                                          node.evaluation > 0 ? "text-emerald-400" : node.evaluation < 0 ? "text-rose-400" : "text-muted-foreground"
                                        )}>
                                          {node.evaluation > 0 ? `+${node.evaluation}` : node.evaluation}
                                        </span>
                                      </>
                                    )}
                                  </span>
                                  
                                  {!isPruned && node.totalNodesSearched > 0 && (
                                    <span className="text-[8px] text-muted-foreground font-mono">
                                      {node.totalNodesSearched > 1000
                                        ? `${(node.totalNodesSearched / 1000).toFixed(1)}k`
                                        : node.totalNodesSearched}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </foreignObject>

                            {/* Collapsible expansion circle indicator */}
                            {!isPruned && node.children.length > 0 && (
                              <circle
                                cx="65"
                                cy="0"
                                r="5.5"
                                className="fill-slate-900 stroke-white/20 hover:stroke-amber-400 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedNodes((prev) => {
                                    const nextSet = new Set(prev);
                                    if (nextSet.has(node.id)) {
                                      nextSet.delete(node.id);
                                    } else {
                                      nextSet.add(node.id);
                                    }
                                    return nextSet;
                                  });
                                }}
                              />
                            )}
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>
              </div>

              {/* Tooltip Overlay for Pruned Node */}
              {hoveredNode && hoveredNode.pruned && (
                <div className="absolute bottom-6 left-6 right-6 bg-rose-950/90 border border-rose-800/30 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2 backdrop-blur-md shadow-xl animate-fade-in z-20">
                  <Info className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-300">Pruned Branch ({hoveredNode.move}): </span>
                    The engine found that this move leads to a worse position than alternatives already evaluated. Under Alpha-Beta Pruning, this branch is cut off to save calculation time.
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------- */}
            {/* RIGHT PANEL: ENGINE EVALUATION CENTER */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-6 h-full flex flex-col order-2 md:order-2 lg:order-3 col-span-1">
              {/* Telemetry Card */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-5">
                <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em] flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  Engine Telemetry
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                    <span className="text-[10px] text-muted-foreground font-mono block">Best Move</span>
                    <span className="text-sm font-semibold text-emerald-400 font-mono mt-0.5 block">
                      {searchResult.bestMove?.san || "-"}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                    <span className="text-[10px] text-muted-foreground font-mono block">Evaluation</span>
                    <span className="text-sm font-semibold text-foreground font-mono mt-0.5 block">
                      {searchResult.score > 0 ? `+${searchResult.score}` : searchResult.score}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                    <span className="text-[10px] text-muted-foreground font-mono block">Nodes Searched</span>
                    <span className="text-xs font-semibold text-foreground font-mono mt-0.5 block">
                      {isPlaying ? playbackIdx * 35 : searchResult.telemetry.nodesSearched}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                    <span className="text-[10px] text-muted-foreground font-mono block">Speed (NPS)</span>
                    <span className="text-xs font-semibold text-foreground font-mono mt-0.5 block">
                      {estimatedNps.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Alpha-Beta Savings</span>
                    <span className="font-semibold text-blue-400 font-mono">
                      {searchResult.telemetry.savingsPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Est. Branching Factor</span>
                    <span className="font-semibold text-purple-400 font-mono">
                      {searchResult.telemetry.branchingFactor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Educational Mode Explanations */}
              <div className="glass-strong rounded-3xl p-6 border border-white/10 flex-1 flex flex-col">
                <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em] mb-4">
                  How it works
                </div>
                
                <div className="space-y-4 text-xs overflow-y-auto flex-1 max-h-[350px] lg:max-h-none pr-1">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <h4 className="font-semibold text-amber-300 flex items-center gap-1.5">
                      Minimax Algorithm
                    </h4>
                    <p className="text-muted-foreground leading-relaxed mt-1">
                      White searches for the move that yields the highest score, assuming Black will reply with the move that minimizes the score.
                    </p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <h4 className="font-semibold text-blue-300 flex items-center gap-1.5">
                      Alpha-Beta Pruning
                    </h4>
                    <p className="text-muted-foreground leading-relaxed mt-1">
                      If the engine discovers a move is worse than an alternative it has already calculated, it stops evaluating that branch immediately.
                    </p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <h4 className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      Evaluation Function
                    </h4>
                    <p className="text-muted-foreground leading-relaxed mt-1">
                      Scores leaf positions by counting material (+1.0 pawn, +3.2 knight) and scoring placement from center control tables.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="curriculum-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6"
          >
            {/* Sidebar checklists */}
            <div className="glass-strong rounded-3xl p-6 border border-white/10 space-y-5">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em] flex items-center gap-1.5">
                <Award className="h-4 w-4 text-emerald-400" />
                Lesson Progress
              </div>
              <div className="space-y-3">
                {LESSONS.map((l) => {
                  const isDone = completedLessons.has(l.id);
                  const isActive = activeLessonId === l.id;
                  
                  return (
                    <div
                      key={l.id}
                      onClick={() => {
                        setActiveLessonId(l.id);
                        triggerLessonAction(l.id);
                      }}
                      className={cn(
                        "w-full rounded-2xl p-3 border transition-all duration-300 flex items-center justify-between cursor-pointer",
                        isActive
                          ? "bg-white/10 border-white/10 text-white"
                          : "bg-transparent border-transparent text-muted-foreground hover:text-white"
                      )}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold truncate">{l.title}</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {l.subtitle}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLesson(l.id);
                        }}
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-slate-950"
                            : "border-white/20 hover:border-white/40"
                        )}
                      >
                        {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lesson Reader Card */}
            {activeLessonId && (
              <div className="glass-strong rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col justify-between space-y-6">
                {(() => {
                  const lesson = LESSONS.find((l) => l.id === activeLessonId)!;
                  const isDone = completedLessons.has(lesson.id);
                  return (
                    <>
                      <div className="space-y-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-300 px-3 py-1 text-xs font-mono uppercase tracking-[0.12em]">
                          Chapter Module Lesson
                        </span>
                        <h2 className="text-3xl font-semibold tracking-tight text-white">
                          {lesson.title}
                        </h2>
                        <h3 className="text-lg text-muted-foreground font-light">
                          {lesson.subtitle}
                        </h3>
                        <p className="text-base text-foreground/80 leading-relaxed pt-2">
                          {lesson.content}
                        </p>
                        
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3 mt-4">
                          <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-200">
                            <span className="font-semibold">Lab Tip: </span>
                            {lesson.interactiveTips}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <button
                          onClick={() => handleToggleLesson(lesson.id)}
                          className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 flex items-center gap-1.5 active:scale-[0.98]",
                            isDone
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
                          )}
                        >
                          {isDone ? "Mark as Incomplete" : "Mark Lesson Completed"}
                        </button>
                        
                        <button
                          onClick={() => {
                            setActiveTab("lab");
                            triggerLessonAction(lesson.id);
                          }}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center gap-1.5"
                        >
                          Jump to Interactive Lab
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ChessEngineLab;
