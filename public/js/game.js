/**
 * ==========================================================================
 * 6D Chess - N-Dimensional Mathematical Game Engine
 * ==========================================================================
 */

const NChess = {
  // Coordinate serialization utilities
  parseKey: (key) => key.split(',').map(Number),
  
  getKey: (coords) => coords.join(','),
  
  inBounds: (coords, dimensions) => {
    if (coords.length !== dimensions.length) return false;
    for (let i = 0; i < coords.length; i++) {
      if (coords[i] < 0 || coords[i] >= dimensions[i]) return false;
    }
    return true;
  },

  isEqual: (c1, c2) => {
    if (c1.length !== c2.length) return false;
    for (let i = 0; i < c1.length; i++) {
      if (c1[i] !== c2[i]) return false;
    }
    return true;
  },

  // Add two coordinate vectors
  addVectors: (v1, v2) => v1.map((val, idx) => val + v2[idx]),

  // Multiply vector by scalar
  scaleVector: (v, s) => v.map(val => val * s),

  // Pre-generate direction vectors to optimize real-time calculations
  directionsCache: {},
  knightDirectionsCache: {},

  getDirections: (n) => {
    if (NChess.directionsCache[n]) return NChess.directionsCache[n];

    const dirs = [];
    const recurse = (current) => {
      if (current.length === n) {
        if (current.some(x => x !== 0)) {
          dirs.push([...current]);
        }
        return;
      }
      for (const val of [-1, 0, 1]) {
        current.push(val);
        recurse(current);
        current.pop();
      }
    };
    recurse([]);
    NChess.directionsCache[n] = dirs;
    return dirs;
  },

  getKnightDirections: (n) => {
    if (NChess.knightDirectionsCache[n]) return NChess.knightDirectionsCache[n];

    const dirs = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        for (const valI of [-1, 1]) {
          for (const valJ of [-2, 2]) {
            const dir = new Array(n).fill(0);
            dir[i] = valI;
            dir[j] = valJ;
            dirs.push(dir);
          }
        }
      }
    }
    NChess.knightDirectionsCache[n] = dirs;
    return dirs;
  },

  // Main validator entrypoint
  getValidMoves: (pieceCoordKey, boardState, dimensions, gameMode = 'classic') => {
    const coords = NChess.parseKey(pieceCoordKey);
    const piece = boardState[pieceCoordKey];
    if (!piece) return [];

    let moves = [];
    const n = dimensions.length;

    switch (piece.type) {
      case 'R': // Rook: moves along exactly 1 axis
        moves = NChess.generateSlidingMoves(coords, boardState, dimensions, 1, 1);
        break;
      case 'B': // Bishop: moves along exactly 2 axes by the same step
        moves = NChess.generateSlidingMoves(coords, boardState, dimensions, 2, 2);
        break;
      case 'Q': // Queen: moves along any subset of axes by the same step
        moves = NChess.generateSlidingMoves(coords, boardState, dimensions, 1, n);
        break;
      case 'K': // King: moves 1 step in any direction
        moves = NChess.generateKingMoves(coords, boardState, dimensions);
        break;
      case 'N': // Knight: moves (2,1) along any 2 axes, keeping others constant
        moves = NChess.generateKnightMoves(coords, boardState, dimensions);
        break;
      case 'P': // Pawn: moves 1 step along Y (+1 for White, -1 for Black)
        moves = NChess.generatePawnMoves(coords, boardState, dimensions);
        break;
    }

    // Filter moves based on check safety (cannot put own King in check)
    // To prevent infinite recursion, we only validate check protection if we aren't already validating check
    moves = moves.filter(moveKey => {
      // Simulate move
      const originalBoard = { ...boardState };
      const simulatedBoard = NChess.simulateMove(originalBoard, pieceCoordKey, moveKey);
      
      return !NChess.isKingInCheck(piece.color, simulatedBoard, dimensions);
    });

    // Special Mode: Portal Warp Logic
    if (gameMode === 'portal') {
      moves = NChess.applyPortalModifications(pieceCoordKey, moves, boardState, dimensions);
    }

    // Special Mode: Gravity Support Logic
    if (gameMode === 'gravity') {
      moves = NChess.applyGravityModifications(pieceCoordKey, moves, boardState, dimensions);
    }

    return moves;
  },

  // Sliding pieces move generator (Rook, Bishop, Queen)
  // minAxes/maxAxes constraint bounds the number of simultaneous active directions (e.g. Rook = 1, Bishop = 2)
  generateSlidingMoves: (coords, boardState, dimensions, minAxes, maxAxes) => {
    const moves = [];
    const n = dimensions.length;
    const directions = NChess.getDirections(n);
    const piece = boardState[NChess.getKey(coords)];

    for (const dir of directions) {
      // Count changing axes
      const activeAxes = dir.filter(x => x !== 0).length;
      if (activeAxes < minAxes || activeAxes > maxAxes) continue;

      let currentCoords = [...coords];
      while (true) {
        currentCoords = NChess.addVectors(currentCoords, dir);
        if (!NChess.inBounds(currentCoords, dimensions)) break;

        const currentKey = NChess.getKey(currentCoords);
        const targetPiece = boardState[currentKey];

        if (!targetPiece) {
          moves.push(currentKey);
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push(currentKey); // Capture enemy
          }
          break; // Blocked by piece
        }
      }
    }

    return moves;
  },

  // Knight jump generator
  generateKnightMoves: (coords, boardState, dimensions) => {
    const moves = [];
    const n = dimensions.length;
    const knightDirs = NChess.getKnightDirections(n);
    const piece = boardState[NChess.getKey(coords)];

    for (const dir of knightDirs) {
      const targetCoords = NChess.addVectors(coords, dir);
      if (NChess.inBounds(targetCoords, dimensions)) {
        const targetKey = NChess.getKey(targetCoords);
        const targetPiece = boardState[targetKey];

        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push(targetKey);
        }
      }
    }

    return moves;
  },

  // King 1-step moves generator
  generateKingMoves: (coords, boardState, dimensions) => {
    const moves = [];
    const n = dimensions.length;
    const directions = NChess.getDirections(n);
    const piece = boardState[NChess.getKey(coords)];

    for (const dir of directions) {
      const targetCoords = NChess.addVectors(coords, dir);
      if (NChess.inBounds(targetCoords, dimensions)) {
        const targetKey = NChess.getKey(targetCoords);
        const targetPiece = boardState[targetKey];

        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push(targetKey);
        }
      }
    }

    return moves;
  },

  // Pawn movement generator
  generatePawnMoves: (coords, boardState, dimensions) => {
    const moves = [];
    const n = dimensions.length;
    const pieceKey = NChess.getKey(coords);
    const piece = boardState[pieceKey];
    
    // Direction vector: +1 along Y axis (index 1) for white, -1 for black
    const yDirection = piece.color === 'white' ? 1 : -1;

    // 1. Single forward step
    const forward1 = [...coords];
    forward1[1] += yDirection;
    
    if (NChess.inBounds(forward1, dimensions)) {
      const f1Key = NChess.getKey(forward1);
      if (!boardState[f1Key]) {
        moves.push(f1Key);

        // 2. Double forward step on first move
        const isStartPos = (piece.color === 'white' && coords[1] === 1) ||
                           (piece.color === 'black' && coords[1] === dimensions[1] - 2);
        
        if (isStartPos) {
          const forward2 = [...coords];
          forward2[1] += (yDirection * 2);
          if (NChess.inBounds(forward2, dimensions)) {
            const f2Key = NChess.getKey(forward2);
            if (!boardState[f2Key]) {
              moves.push(f2Key);
            }
          }
        }
      }
    }

    // 3. Captures: moves +1 along Y, and exactly one other axis changes by +/-1
    for (let axis = 0; axis < n; axis++) {
      if (axis === 1) continue; // Skip Y axis
      
      for (const step of [-1, 1]) {
        const captureCoords = [...coords];
        captureCoords[1] += yDirection; // Step forward
        captureCoords[axis] += step;    // Step diagonal along another axis

        if (NChess.inBounds(captureCoords, dimensions)) {
          const capKey = NChess.getKey(captureCoords);
          const targetPiece = boardState[capKey];
          if (targetPiece && targetPiece.color !== piece.color) {
            moves.push(capKey);
          }
        }
      }
    }

    return moves;
  },

  // Simulate a move on a shallow copy of the board
  simulateMove: (boardState, fromKey, toKey) => {
    const nextBoard = { ...boardState };
    const piece = nextBoard[fromKey];
    
    delete nextBoard[fromKey];
    
    // Check if target is a list of targets (for quantum superposition split)
    if (Array.isArray(toKey)) {
      nextBoard[toKey[0]] = { ...piece, superposition: toKey, hasMoved: true };
      nextBoard[toKey[1]] = { ...piece, superposition: toKey, hasMoved: true };
    } else {
      nextBoard[toKey] = { ...piece, hasMoved: true };
    }

    return nextBoard;
  },

  // Check if a player's King is in Check
  isKingInCheck: (color, boardState, dimensions) => {
    // 1. Locate King
    let kingKey = null;
    for (const key in boardState) {
      const piece = boardState[key];
      if (piece && piece.type === 'K' && piece.color === color) {
        kingKey = key;
        break;
      }
    }

    if (!kingKey) return false; // If King is missing, let it slide (e.g. custom configs or tests)

    // 2. Loop through all opponent pieces and see if they can move to King's position
    const opponentColor = color === 'white' ? 'black' : 'white';
    
    for (const key in boardState) {
      const piece = boardState[key];
      if (piece && piece.color === opponentColor) {
        const coords = NChess.parseKey(key);
        let moves = [];
        const n = dimensions.length;

        // Simplified fast-moves check without recursion safety filter
        switch (piece.type) {
          case 'R':
            moves = NChess.generateSlidingMoves(coords, boardState, dimensions, 1, 1);
            break;
          case 'B':
            moves = NChess.generateSlidingMoves(coords, boardState, dimensions, 2, 2);
            break;
          case 'Q':
            moves = NChess.generateSlidingMoves(coords, boardState, dimensions, 1, n);
            break;
          case 'K':
            moves = NChess.generateKingMoves(coords, boardState, dimensions);
            break;
          case 'N':
            moves = NChess.generateKnightMoves(coords, boardState, dimensions);
            break;
          case 'P':
            moves = NChess.generatePawnMoves(coords, boardState, dimensions);
            break;
        }

        if (moves.includes(kingKey)) {
          return true; // King is in check!
        }
      }
    }

    return false;
  },

  // Detect Checkmate or Stalemate
  checkGameEndState: (color, boardState, dimensions, gameMode = 'classic') => {
    // If player has at least one valid move, game is NOT over
    for (const key in boardState) {
      const piece = boardState[key];
      if (piece && piece.color === color) {
        const moves = NChess.getValidMoves(key, boardState, dimensions, gameMode);
        if (moves.length > 0) {
          return 'active';
        }
      }
    }

    // No moves available! Check if King is currently in check
    const inCheck = NChess.isKingInCheck(color, boardState, dimensions);
    if (inCheck) {
      return 'checkmate'; // King is trapped
    } else {
      return 'stalemate'; // No moves, not in check
    }
  },

  // Portal Mode Linkages
  // Portals: on ALL active Z, W, V, U boards, coordinate [0,0] is connected to [width-1, height-1]
  applyPortalModifications: (pieceCoordKey, moves, boardState, dimensions) => {
    const width = dimensions[0];
    const height = dimensions[1];
    const coords = NChess.parseKey(pieceCoordKey);
    const piece = boardState[pieceCoordKey];

    return moves.map(moveKey => {
      const mCoords = NChess.parseKey(moveKey);
      
      // Portal A: Bottom Left
      if (mCoords[0] === 0 && mCoords[1] === 0) {
        const warpCoords = [...mCoords];
        warpCoords[0] = width - 1;
        warpCoords[1] = height - 1;
        const warpKey = NChess.getKey(warpCoords);
        const targetPiece = boardState[warpKey];
        
        if (!targetPiece || targetPiece.color !== piece.color) {
          return warpKey;
        }
      }

      // Portal B: Top Right
      if (mCoords[0] === width - 1 && mCoords[1] === height - 1) {
        const warpCoords = [...mCoords];
        warpCoords[0] = 0;
        warpCoords[1] = 0;
        const warpKey = NChess.getKey(warpCoords);
        const targetPiece = boardState[warpKey];
        
        if (!targetPiece || targetPiece.color !== piece.color) {
          return warpKey;
        }
      }

      return moveKey;
    });
  },

  // Check if cell is a portal
  isPortal: (coords, dimensions) => {
    const width = dimensions[0];
    const height = dimensions[1];
    return (coords[0] === 0 && coords[1] === 0) || 
           (coords[0] === width - 1 && coords[1] === height - 1);
  },

  // Gravity Support Logic (Z represents height)
  // For z > 0, there must be a piece underneath at z-1, otherwise moves are restricted or trigger a fall
  applyGravityModifications: (pieceCoordKey, moves, boardState, dimensions) => {
    if (dimensions.length < 3) return moves; // Needs Z axis

    const piece = boardState[pieceCoordKey];
    
    return moves.filter(moveKey => {
      const mCoords = NChess.parseKey(moveKey);
      const z = mCoords[2]; // Z index

      // If moving to z > 0, check if supported
      if (z > 0) {
        const supportCoords = [...mCoords];
        supportCoords[2] = z - 1;
        const supportKey = NChess.getKey(supportCoords);
        
        // Supported if there is any piece underneath (friend or foe)
        const isSupported = !!boardState[supportKey];
        return isSupported;
      }
      return true; // ground layer always supported
    });
  },

  // Gravity Fall Engine
  // Recursively drops unsupported pieces down the Z-axis
  calculateGravityFalls: (boardState, dimensions) => {
    if (dimensions.length < 3) return []; // No Z axis, no falls

    const falls = [];
    let boardCopy = { ...boardState };
    let fell = true;

    while (fell) {
      fell = false;
      
      // Look for any piece above ground (z > 0) that has no support at z-1
      for (const key in boardCopy) {
        const piece = boardCopy[key];
        if (!piece) continue;

        const coords = NChess.parseKey(key);
        const z = coords[2];

        if (z > 0) {
          const supportCoords = [...coords];
          supportCoords[2] = z - 1;
          const supportKey = NChess.getKey(supportCoords);

          if (!boardCopy[supportKey]) {
            // Drop piece!
            delete boardCopy[key];
            boardCopy[supportKey] = piece;
            
            falls.push({ from: key, to: supportKey });
            fell = true;
            break; // Restart loop to drop recursively
          }
        }
      }
    }

    return falls;
  }
};

// Export for node or browser inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NChess;
} else {
  window.NChess = NChess;
}
