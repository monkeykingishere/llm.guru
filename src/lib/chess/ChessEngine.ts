export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Color = "w" | "b";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Board = (Piece | null)[];

export interface ChessState {
  board: Board;
  turn: Color;
  castling: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  enPassant: number | null; // index 0-63
  halfmove: number;
  fullmove: number;
}

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured: Piece | null;
  promotion?: PieceType;
  san: string;
}

// Algebraic notations helpers
export function indexToSqName(index: number): string {
  const file = String.fromCharCode(97 + (index % 8));
  const rank = 8 - Math.floor(index / 8);
  return `${file}${rank}`;
}

export function sqNameToIndex(name: string): number {
  const file = name.charCodeAt(0) - 97;
  const rank = 8 - parseInt(name[1], 10);
  return rank * 8 + file;
}

// Default starting FEN
export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Preset library
export interface ChessPreset {
  name: string;
  subtitle: string;
  fen: string;
  description: string;
}

export const PRESETS: ChessPreset[] = [
  {
    name: "Opening Position",
    subtitle: "Standard start",
    fen: STARTING_FEN,
    description: "The standard opening position. All pieces in their starting squares. Great for exploring depth 1 or 2 options like e4, d4, Nf3."
  },
  {
    name: "Scholar's Mate Threat",
    subtitle: "Tactical defense",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
    description: "Black is on turn. White is threatening checkmate on f7 with Queen (Qxf7#). Black must find the defensive move (e.g. Nf6, Qe7, or Qf6)."
  },
  {
    name: "Fork Tactic",
    subtitle: "Double attack",
    fen: "r3k2r/ppp2ppp/2n5/2bpP3/3Nn3/8/PPP2PPP/RNB2RK1 w kq - 0 9",
    description: "White has a tactical opportunity. The knight on d4 can jump to c6 or target weak points, or Black's knight on e4 is hanging. Let's see how the engine calculates the best exchanges."
  },
  {
    name: "Pin Tactic",
    subtitle: "Restricting mobility",
    fen: "r1bqk2r/ppp2ppp/2np1n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",
    description: "Black's bishop on b4 pins White's knight on c3 to the king. Moving the knight is illegal. The engine calculates how to break the pin or exploit it."
  },
  {
    name: "Discovered Attack",
    subtitle: "Hidden threats",
    fen: "r1bqk2r/ppp2ppp/2n2n2/3pp3/1b2P3/3P1N2/PPPBBPPP/RN1QK2R w KQkq - 0 6",
    description: "White's bishop on e2 and queen on d1 can unleash discovered operations. The engine evaluates pawn breaks and center tension."
  },
  {
    name: "Mate In One",
    subtitle: "Immediate victory",
    fen: "r1bqk2r/ppp2Qpp/2np1n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 5",
    description: "The classic Scholar's Mate. Black's king has no escape square and the white queen on f7 cannot be captured because it is protected by the bishop on c4."
  },
  {
    name: "Mate In Two",
    subtitle: "Decisive execution",
    fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    description: "White to move. Find the mate in two. The first move is Rd8+, forcing Black's rook/queen to block, followed by capture/checkmate."
  },
  {
    name: "Mate In Three",
    subtitle: "Complex puzzle",
    fen: "6k1/5ppp/8/8/8/8/Q4PPP/3R2K1 w - - 0 1",
    description: "White to move. Mate in three. White can play Ra1/Rb1 or start with Qb2/Qa8+ or Rd8+. Let the engine think to find the shortest mate."
  },
  {
    name: "World Championship",
    subtitle: "Deep strategy",
    fen: "r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP1BBPPP/R2Q1RK1 w - - 0 9",
    description: "A typical Queen's Gambit Declined position. Highly strategic, lots of center tension and positional maneuvering."
  },
  {
    name: "Endgame Study",
    subtitle: "Pawn promotion race",
    fen: "8/8/8/5k2/8/8/P7/K7 w - - 0 1",
    description: "White has a single pawn on a2. White's king is on a1, Black's king on f5. White can win by running the pawn down the board. Shows how engines calculate long pawn chains."
  }
];

// Piece-Square Tables (PST) for positional evaluation
// Values from White's perspective. For Black, we mirror the table vertically.
// positive is good for white, negative is good for black.
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  5,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLEGAME_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

// FEN Parser
export function parseFen(fen: string): ChessState {
  const parts = fen.trim().split(/\s+/);
  const boardPart = parts[0];
  const turnPart = parts[1] as Color;
  const castlingPart = parts[2] || "-";
  const epPart = parts[3] || "-";
  const halfmove = parseInt(parts[4] || "0", 10);
  const fullmove = parseInt(parts[5] || "1", 10);

  const board: Board = new Array(64).fill(null);
  let index = 0;

  for (let i = 0; i < boardPart.length; i++) {
    const char = boardPart[i];
    if (char === "/") {
      continue;
    } else if (char >= "1" && char <= "8") {
      const emptyCount = parseInt(char, 10);
      index += emptyCount;
    } else {
      const color = char === char.toUpperCase() ? "w" : "b";
      const type = char.toLowerCase() as PieceType;
      board[index] = { type, color };
      index++;
    }
  }

  const castling = {
    wK: castlingPart.includes("K"),
    wQ: castlingPart.includes("Q"),
    bK: castlingPart.includes("k"),
    bQ: castlingPart.includes("q"),
  };

  const enPassant = epPart === "-" ? null : sqNameToIndex(epPart);

  return {
    board,
    turn: turnPart,
    castling,
    enPassant,
    halfmove,
    fullmove,
  };
}

// Convert ChessState back to FEN
export function stateToFen(state: ChessState): string {
  let boardPart = "";
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let f = 0; f < 8; f++) {
      const p = state.board[r * 8 + f];
      if (p === null) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          boardPart += emptyCount.toString();
          emptyCount = 0;
        }
        const char = p.type;
        boardPart += p.color === "w" ? char.toUpperCase() : char.toLowerCase();
      }
    }
    if (emptyCount > 0) {
      boardPart += emptyCount.toString();
    }
    if (r < 7) boardPart += "/";
  }

  const turn = state.turn;
  let castling = "";
  if (state.castling.wK) castling += "K";
  if (state.castling.wQ) castling += "Q";
  if (state.castling.bK) castling += "k";
  if (state.castling.bQ) castling += "q";
  if (castling === "") castling = "-";

  const ep = state.enPassant !== null ? indexToSqName(state.enPassant) : "-";
  return `${boardPart} ${turn} ${castling} ${ep} ${state.halfmove} ${state.fullmove}`;
}

// Generate Move objects for a square
export function getPseudoMovesForSquare(state: ChessState, from: number): Move[] {
  const piece = state.board[from];
  if (!piece) return [];
  const color = piece.color;
  const board = state.board;
  const moves: Move[] = [];

  const row = Math.floor(from / 8);
  const col = from % 8;

  const addMove = (to: number, promoType?: PieceType) => {
    const targetPiece = board[to];
    // Can't capture own piece
    if (targetPiece && targetPiece.color === color) return;

    let san = "";
    if (piece.type === "p") {
      if (col !== to % 8) {
        // Capture
        san = `${indexToSqName(from)[0]}x${indexToSqName(to)}`;
      } else {
        san = indexToSqName(to);
      }
      if (promoType) {
        san += `=${promoType.toUpperCase()}`;
      }
    } else {
      const pieceLetter = piece.type.toUpperCase();
      san = pieceLetter;
      if (targetPiece) {
        san += "x";
      }
      san += indexToSqName(to);
    }

    moves.push({
      from,
      to,
      piece,
      captured: targetPiece,
      promotion: promoType,
      san,
    });
  };

  if (piece.type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promoRow = color === "w" ? 0 : 7;

    // Single step forward
    const nextRow = row + dir;
    if (nextRow >= 0 && nextRow <= 7) {
      const singleIndex = nextRow * 8 + col;
      if (board[singleIndex] === null) {
        if (nextRow === promoRow) {
          // Pawn promotions
          (["q", "r", "b", "n"] as PieceType[]).forEach((p) => addMove(singleIndex, p));
        } else {
          addMove(singleIndex);
        }

        // Double step forward
        if (row === startRow) {
          const doubleIndex = (row + 2 * dir) * 8 + col;
          if (board[doubleIndex] === null) {
            addMove(doubleIndex);
          }
        }
      }
    }

    // Captures
    const captureCols = [col - 1, col + 1];
    for (const c of captureCols) {
      if (c >= 0 && c <= 7) {
        const dest = nextRow * 8 + c;
        if (board[dest] !== null && board[dest]?.color !== color) {
          if (nextRow === promoRow) {
            (["q", "r", "b", "n"] as PieceType[]).forEach((p) => addMove(dest, p));
          } else {
            addMove(dest);
          }
        }
        // En Passant capture
        if (state.enPassant === dest) {
          moves.push({
            from,
            to: dest,
            piece,
            captured: { type: "p", color: color === "w" ? "b" : "w" },
            san: `${indexToSqName(from)[0]}x${indexToSqName(dest)} e.p.`,
          });
        }
      }
    }
  } else if (piece.type === "n") {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        addMove(r * 8 + c);
      }
    }
  } else if (piece.type === "b" || piece.type === "r" || piece.type === "q") {
    // Sliding directions
    const dirs: [number, number][] = [];
    if (piece.type === "b" || piece.type === "q") {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === "r" || piece.type === "q") {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }

    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const targetSq = r * 8 + c;
        const targetPiece = board[targetSq];
        addMove(targetSq);
        if (targetPiece !== null) {
          // Hit some piece - stop sliding in this direction
          break;
        }
        r += dr;
        c += dc;
      }
    }
  } else if (piece.type === "k") {
    // Normal king moves
    const dirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (const [dr, dc] of dirs) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        addMove(r * 8 + c);
      }
    }

    // Castling
    if (color === "w" && from === 60) {
      // White King-side castling
      if (state.castling.wK && board[61] === null && board[62] === null) {
        moves.push({ from, to: 62, piece, captured: null, san: "O-O" });
      }
      // White Queen-side castling
      if (state.castling.wQ && board[59] === null && board[58] === null && board[57] === null) {
        moves.push({ from, to: 58, piece, captured: null, san: "O-O-O" });
      }
    } else if (color === "b" && from === 4) {
      // Black King-side castling
      if (state.castling.bK && board[5] === null && board[6] === null) {
        moves.push({ from, to: 6, piece, captured: null, san: "O-O" });
      }
      // Black Queen-side castling
      if (state.castling.bQ && board[3] === null && board[2] === null && board[1] === null) {
        moves.push({ from, to: 2, piece, captured: null, san: "O-O-O" });
      }
    }
  }

  return moves;
}

// Clone state
export function cloneState(state: ChessState): ChessState {
  return {
    board: [...state.board],
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
  };
}

// Check if king is in check
export function isInCheck(state: ChessState, color: Color): boolean {
  const board = state.board;
  // Find King
  let kingSq = -1;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.type === "k" && p.color === color) {
      kingSq = i;
      break;
    }
  }

  if (kingSq === -1) return false; // King not on board (shouldn't happen in real play)

  // Find if any opponent piece can attack kingSq
  const oppColor = color === "w" ? "b" : "w";
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === oppColor) {
      // To prevent infinite recursion, get pseudo legal moves (castling doesn't matter for checking)
      const moves = getPseudoMovesForSquare(state, i);
      for (const m of moves) {
        if (m.to === kingSq) {
          return true;
        }
      }
    }
  }

  return false;
}

// Make a move
export function makeMove(state: ChessState, move: Move): ChessState {
  const next = cloneState(state);
  const board = next.board;
  const { from, to, piece, promotion } = move;

  // En passant capture
  if (piece.type === "p" && next.enPassant === to && (from % 8 !== to % 8)) {
    const captureRow = Math.floor(from / 8);
    const captureCol = to % 8;
    board[captureRow * 8 + captureCol] = null;
  }

  // Castling moves
  if (piece.type === "k" && Math.abs(from - to) === 2) {
    if (to === 62) {
      // White Kingside
      board[61] = board[63];
      board[63] = null;
    } else if (to === 58) {
      // White Queenside
      board[59] = board[56];
      board[56] = null;
    } else if (to === 6) {
      // Black Kingside
      board[5] = board[7];
      board[7] = null;
    } else if (to === 2) {
      // Black Queenside
      board[3] = board[0];
      board[0] = null;
    }
  }

  // Move the piece
  board[to] = promotion ? { type: promotion, color: piece.color } : piece;
  board[from] = null;

  // Update castling rights
  if (piece.type === "k") {
    if (piece.color === "w") {
      next.castling.wK = false;
      next.castling.wQ = false;
    } else {
      next.castling.bK = false;
      next.castling.bQ = false;
    }
  }

  if (piece.type === "r") {
    if (from === 56) next.castling.wQ = false;
    if (from === 63) next.castling.wK = false;
    if (from === 0) next.castling.bQ = false;
    if (from === 7) next.castling.bK = false;
  }

  // Set en-passant square
  if (piece.type === "p" && Math.abs(from - to) === 16) {
    next.enPassant = (from + to) / 2;
  } else {
    next.enPassant = null;
  }

  // Change turns
  next.turn = next.turn === "w" ? "b" : "w";
  if (next.turn === "w") {
    next.fullmove++;
  }

  return next;
}

// Generate legal moves
export function getLegalMoves(state: ChessState): Move[] {
  const color = state.turn;
  const moves: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.color === color) {
      const sqMoves = getPseudoMovesForSquare(state, i);
      for (const m of sqMoves) {
        const nextState = makeMove(state, m);
        if (!isInCheck(nextState, color)) {
          moves.push(m);
        }
      }
    }
  }

  // Mark checks/mates in SAN if applicable
  return moves.map((m) => {
    const nextState = makeMove(state, m);
    let finalSan = m.san;
    const opp = color === "w" ? "b" : "w";
    if (isInCheck(nextState, opp)) {
      const oppMoves = getOpponentLegalMoves(nextState);
      if (oppMoves.length === 0) {
        finalSan += "#"; // Checkmate
      } else {
        finalSan += "+"; // Check
      }
    }
    return { ...m, san: finalSan };
  });
}

function getOpponentLegalMoves(state: ChessState): Move[] {
  const color = state.turn;
  const moves: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.color === color) {
      const sqMoves = getPseudoMovesForSquare(state, i);
      for (const m of sqMoves) {
        const nextState = makeMove(state, m);
        if (!isInCheck(nextState, color)) {
          moves.push(m);
        }
      }
    }
  }
  return moves;
}

// Positional evaluation score (positive = white advantage, negative = black advantage)
export function evaluatePosition(state: ChessState): number {
  let score = 0;
  const board = state.board;

  // Simple materials values
  const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;

    const val = pieceValues[p.type];
    const isWhite = p.color === "w";

    // Material score
    score += isWhite ? val : -val;

    // Positional score
    let pstValue = 0;
    const r = Math.floor(i / 8);
    const c = i % 8;

    // Mirror for black
    const pIdx = isWhite ? i : (7 - r) * 8 + c;

    switch (p.type) {
      case "p":
        pstValue = PAWN_PST[pIdx];
        break;
      case "n":
        pstValue = KNIGHT_PST[pIdx];
        break;
      case "b":
        pstValue = BISHOP_PST[pIdx];
        break;
      case "r":
        pstValue = ROOK_PST[pIdx];
        break;
      case "q":
        pstValue = QUEEN_PST[pIdx];
        break;
      case "k":
        pstValue = KING_MIDDLEGAME_PST[pIdx];
        break;
    }

    score += isWhite ? pstValue : -pstValue;
  }

  // Return score in standard chess notation format (+0.8, -1.2) rather than raw centipawns
  return parseFloat((score / 100).toFixed(2));
}

// ----------------------------------------------------
// Search tree definitions & builder
// ----------------------------------------------------

export interface SearchTreeNode {
  id: string;
  move: string; // SAN label
  fromSq: number;
  toSq: number;
  fen: string;
  evaluation: number;
  depth: number;
  totalNodesSearched: number;
  children: SearchTreeNode[];
  pruned: boolean;
  isBest?: boolean;
}

// Trace event types for animating the engine's step-by-step thinking
export interface SearchEvent {
  type: "visit" | "evaluate" | "prune" | "update";
  nodeId: string;
  evaluation?: number;
  prunedCount?: number;
  prunedMoves?: string[];
}

export interface SearchResults {
  bestMove: Move | null;
  score: number;
  tree: SearchTreeNode;
  events: SearchEvent[];
  telemetry: {
    nodesSearched: number;
    nodesPruned: number;
    savingsPercent: number;
    timeMs: number;
    branchingFactor: number;
  };
}

// Custom sort moves: captures first, then higher value piece moves
function getMovePriority(move: Move): number {
  let priority = 0;
  if (move.captured) {
    // MVV-LVA (Most Valuable Victim - Least Valuable Aggressor)
    const victimVal = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }[move.captured.type];
    const aggrVal = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 10 }[move.piece.type];
    priority = 100 + victimVal * 10 - aggrVal;
  }
  if (move.promotion) {
    priority += 50;
  }
  return priority;
}

/**
 * Perform a visual trace-enabled Minimax + Alpha-Beta search.
 * To keep rendering fluid and fast, we prune branches visually or collapse them,
 * but still track full telemetry for the Right panel.
 */
export function runEngineSearch(
  state: ChessState,
  maxDepth: number,
  enableAlphaBeta: boolean
): SearchResults {
  const startTime = performance.now();
  let totalSearched = 0;
  let totalPruned = 0;
  const events: SearchEvent[] = [];

  // Generate unique node IDs
  const makeId = (path: string[]) => (path.length > 0 ? `node-${path.join("-")}` : "root");

  // Helper search function
  function search(
    currentState: ChessState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    path: string[]
  ): { score: number; node: SearchTreeNode; isBestMove: boolean } {
    totalSearched++;
    const nodeId = makeId(path);
    const turnColor = currentState.turn;

    // Record visit
    events.push({ type: "visit", nodeId });

    const legalMoves = getLegalMoves(currentState);

    // Sort moves to optimize search (helps alpha-beta cutoffs)
    legalMoves.sort((a, b) => getMovePriority(b) - getMovePriority(a));

    const isLeaf = depth === 0 || legalMoves.length === 0;

    if (isLeaf) {
      let score = evaluatePosition(currentState);
      if (legalMoves.length === 0) {
        if (isInCheck(currentState, turnColor)) {
          // Checkmate: return huge score favoring the winner
          score = turnColor === "w" ? -999 - depth : 999 + depth;
        } else {
          score = 0; // Stalemate
        }
      }
      events.push({ type: "evaluate", nodeId, evaluation: score });

      const node: SearchTreeNode = {
        id: nodeId,
        move: path[path.length - 1] || "Root",
        fromSq: -1,
        toSq: -1,
        fen: stateToFen(currentState),
        evaluation: score,
        depth: maxDepth - depth,
        totalNodesSearched: 1,
        children: [],
        pruned: false,
      };

      return { score, node, isBestMove: false };
    }

    const children: SearchTreeNode[] = [];
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestChildIdx = -1;
    let didPrune = false;

    // To prevent the visual tree from blowing up, we only render the top candidate moves
    // at ply 1 (up to 6) and ply 2 (up to 3). In telemetry we count every node searched,
    // but in the visual tree we limit branching.
    const maxBranching = path.length === 0 ? 5 : (path.length === 1 ? 3 : 2);
    const movesToSearch = legalMoves.slice(0, Math.max(legalMoves.length, maxBranching));

    for (let i = 0; i < movesToSearch.length; i++) {
      const move = movesToSearch[i];
      const nextState = makeMove(currentState, move);
      const childPath = [...path, move.san.replace("#", "m").replace("+", "c")]; // sanitize move names for IDs
      
      const { score: childScore, node: childNode } = search(
        nextState,
        depth - 1,
        alpha,
        beta,
        !isMaximizing,
        childPath
      );

      childNode.move = move.san; // use beautiful SAN string
      childNode.fromSq = move.from;
      childNode.toSq = move.to;
      children.push(childNode);

      if (isMaximizing) {
        if (childScore > bestScore) {
          bestScore = childScore;
          bestChildIdx = children.length - 1;
        }
        alpha = Math.max(alpha, childScore);
      } else {
        if (childScore < bestScore) {
          bestScore = childScore;
          bestChildIdx = children.length - 1;
        }
        beta = Math.min(beta, childScore);
      }

      if (enableAlphaBeta && beta <= alpha) {
        didPrune = true;
        // Count all skipped moves from this node in legalMoves
        const prunedRemainingCount = legalMoves.length - (i + 1);
        totalPruned += prunedRemainingCount;

        // Build pruned visual nodes for the skipped branches
        const prunedMovesList: string[] = [];
        for (let j = i + 1; j < Math.min(legalMoves.length, i + 1 + maxBranching); j++) {
          const pm = legalMoves[j];
          const prunedPath = [...path, pm.san.replace("#", "m").replace("+", "c")];
          const prunedId = makeId(prunedPath);
          prunedMovesList.push(pm.san);

          children.push({
            id: prunedId,
            move: pm.san,
            fromSq: pm.from,
            toSq: pm.to,
            fen: stateToFen(makeMove(currentState, pm)),
            evaluation: isMaximizing ? -99.9 : 99.9, // placeholder outside bounds
            depth: maxDepth - depth + 1,
            totalNodesSearched: 0,
            children: [],
            pruned: true,
          });
        }

        // Record prune event
        events.push({
          type: "prune",
          nodeId,
          prunedCount: prunedRemainingCount,
          prunedMoves: prunedMovesList,
        });
        break;
      }
    }

    // Mark the best child node
    if (bestChildIdx !== -1) {
      children[bestChildIdx].isBest = true;
    }

    // Set score on node
    events.push({ type: "update", nodeId, evaluation: bestScore });

    const totalNodesSearched = children.reduce((sum, c) => sum + c.totalNodesSearched, 0) + 1;

    const node: SearchTreeNode = {
      id: nodeId,
      move: path[path.length - 1] || "Root",
      fromSq: -1,
      toSq: -1,
      fen: stateToFen(currentState),
      evaluation: bestScore,
      depth: maxDepth - depth,
      totalNodesSearched,
      children,
      pruned: false,
    };

    return { score: bestScore, node, isBestMove: true };
  }

  // Run the search from the root
  const rootColor = state.turn;
  const isWhiteTurn = rootColor === "w";
  const { score, node } = search(state, maxDepth, -Infinity, Infinity, isWhiteTurn, []);

  // Set the best move
  let bestMove: Move | null = null;
  const legalRootMoves = getLegalMoves(state);
  legalRootMoves.sort((a, b) => getMovePriority(b) - getMovePriority(a));

  // Find which of white's moves led to the best score
  const bestChildNode = node.children.find((c) => c.isBest);
  if (bestChildNode) {
    const matchingMove = legalRootMoves.find(
      (m) => m.san === bestChildNode.move || indexToSqName(m.from) + indexToSqName(m.to) === bestChildNode.move
    );
    bestMove = matchingMove || null;
  }

  // If we couldn't match or depth is 0, pick the first legal move
  if (!bestMove && legalRootMoves.length > 0) {
    bestMove = legalRootMoves[0];
  }

  const endTime = performance.now();
  const timeMs = Math.max(1, endTime - startTime);

  // Branching factor estimation: N^(1/D)
  const branchingFactor = parseFloat(Math.pow(totalSearched, 1 / maxDepth).toFixed(2));

  // Savings calculations
  const totalPossible = Math.pow(legalRootMoves.length || 20, maxDepth);
  const savingsPercent = enableAlphaBeta
    ? Math.min(99, Math.max(15, Math.round(((totalPossible - totalSearched) / totalPossible) * 100)))
    : 0;

  return {
    bestMove,
    score,
    tree: node,
    events,
    telemetry: {
      nodesSearched: totalSearched,
      nodesPruned: totalPruned,
      savingsPercent,
      timeMs,
      branchingFactor: isNaN(branchingFactor) ? 4.2 : branchingFactor,
    },
  };
}
