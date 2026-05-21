const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store room states in-memory
const rooms = {};

// Helper to generate unique Room ID
function generateRoomId() {
  let id = '';
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // No 'O' or '0' for readability
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Generate adaptive initial pieces placement based on board dimensions
function generateInitialBoard(dimensions) {
  const width = dimensions[0] || 8;
  const height = dimensions[1] || 8;
  
  const board = {};
  
  // Home board coordinates: all extra dimensions are at index 0
  // Coordinate keys are strings: "x,y,z,w,v,u"
  const getCoordKey = (x, y) => {
    const coords = [x, y];
    for (let d = 2; d < dimensions.length; d++) {
      coords.push(0);
    }
    return coords.join(',');
  };

  // Standard pieces layout mapping based on width
  let rowLayout = [];
  if (width === 8) {
    rowLayout = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  } else if (width === 6) {
    rowLayout = ['R', 'N', 'Q', 'K', 'N', 'R'];
  } else if (width === 4) {
    rowLayout = ['R', 'Q', 'K', 'R'];
  } else {
    // Generate adaptive row
    rowLayout = new Array(width).fill('P');
    const mid = Math.floor(width / 2);
    if (width > 0) rowLayout[0] = 'R';
    if (width > 1) rowLayout[width - 1] = 'R';
    if (width > 2) rowLayout[1] = 'N';
    if (width > 3) rowLayout[width - 2] = 'N';
    if (width > 4) rowLayout[2] = 'B';
    if (width > 5) rowLayout[width - 3] = 'B';
    if (width > mid) rowLayout[mid] = 'K';
    if (width > mid - 1 && mid - 1 >= 0) rowLayout[mid - 1] = 'Q';
  }

  // White pieces (y = 0 for back row, y = 1 for pawns)
  for (let x = 0; x < width; x++) {
    board[getCoordKey(x, 0)] = { type: rowLayout[x], color: 'white', hasMoved: false };
    if (height > 2) {
      board[getCoordKey(x, 1)] = { type: 'P', color: 'white', hasMoved: false };
    }
  }

  // Black pieces (y = height - 1 for back row, y = height - 2 for pawns)
  for (let x = 0; x < width; x++) {
    board[getCoordKey(x, height - 1)] = { type: rowLayout[x], color: 'black', hasMoved: false };
    if (height > 2) {
      board[getCoordKey(x, height - 2)] = { type: 'P', color: 'black', hasMoved: false };
    }
  }

  return board;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Retrieve list of public active lobbies
  socket.on('get-public-lobbies', () => {
    const list = Object.values(rooms)
      .filter(r => !r.isPrivate)
      .map(r => ({
        id: r.id,
        name: r.name,
        creator: r.creator,
        playersCount: r.players.length,
        status: r.status,
        dimensions: r.dimensions,
        mode: r.mode
      }));
    socket.emit('public-lobbies-list', list);
  });

  // Create a new room
  socket.on('create-room', (data) => {
    const roomId = generateRoomId();
    
    // Default 6D dimensions: 4x4 (board), 2 (Z layers), 2 (W timelines), 2 (V universes), 2 (U realities)
    const dimensions = data.dimensions || [4, 4, 2, 2, 2, 2];
    const mode = data.mode || 'classic';
    const name = data.name || `${data.playerName || 'Player'}'s 6D Domain`;
    const isPrivate = !!data.isPrivate;
    const password = data.password || '';
    const turnTimer = data.turnTimer || 0; // In seconds, 0 = infinite

    rooms[roomId] = {
      id: roomId,
      name: name,
      creator: data.playerName || 'Player',
      isPrivate: isPrivate,
      password: password,
      status: 'waiting',
      dimensions: dimensions,
      mode: mode,
      turnTimer: turnTimer,
      players: [
        {
          id: socket.id,
          name: data.playerName || 'Player 1',
          color: 'white', // host defaults to white
          isHost: true
        }
      ],
      gameState: null
    };

    socket.join(roomId);
    socket.emit('room-created', rooms[roomId]);
    console.log(`Room created: ${roomId} by ${data.playerName}`);

    // Broadcast updated public lobby list
    io.emit('public-lobbies-updated');
  });

  // Join a room
  socket.on('join-room', (data) => {
    const { roomId, playerName, password } = data;
    const room = rooms[roomId];

    if (!room) {
      return socket.emit('error-msg', 'Oda bulunamadı!');
    }

    if (room.status === 'playing') {
      return socket.emit('error-msg', 'Oyun çoktan başladı! İzleyici olarak katılamazsınız.');
    }

    if (room.isPrivate && room.password !== password) {
      return socket.emit('error-msg', 'Şifre hatalı!');
    }

    if (room.players.length >= 2) {
      return socket.emit('error-msg', 'Oda dolu! En fazla 2 oyuncu katılabilir.');
    }

    // Join room
    const assignedColor = room.players[0].color === 'white' ? 'black' : 'white';
    const newPlayer = {
      id: socket.id,
      name: playerName || 'Player 2',
      color: assignedColor,
      isHost: false
    };

    room.players.push(newPlayer);
    socket.join(roomId);
    
    // Notify room of new player
    io.to(roomId).emit('player-joined', { room, newPlayer });
    socket.emit('room-joined', room);
    console.log(`Player ${newPlayer.name} joined room ${roomId}`);

    // Broadcast updated public lobby list
    io.emit('public-lobbies-updated');
  });

  // Update room settings (only host can do this)
  socket.on('update-room-settings', (data) => {
    const { roomId, dimensions, mode, turnTimer, name, isPrivate, password } = data;
    const room = rooms[roomId];

    if (!room) return;
    
    // Verify player is host
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    if (dimensions) room.dimensions = dimensions;
    if (mode) room.mode = mode;
    if (turnTimer !== undefined) room.turnTimer = turnTimer;
    if (name) room.name = name;
    if (isPrivate !== undefined) room.isPrivate = isPrivate;
    if (password !== undefined) room.password = password;

    io.to(roomId).emit('room-settings-updated', room);
    io.emit('public-lobbies-updated');
  });

  // Start the game with virtual coin-flip for turns and color assignment!
  socket.on('start-game', (data) => {
    const { roomId } = data;
    const room = rooms[roomId];

    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    if (room.players.length < 2) {
      return socket.emit('error-msg', 'Oyunu başlatmak için en az 2 oyuncu gereklidir!');
    }

    room.status = 'playing';

    // Virtual Coin Flip to determine who goes first and gets White!
    // Coin flip selects one of the 2 players randomly.
    const coinFlipResult = Math.random() < 0.5 ? 0 : 1; // 0 = Player 1, 1 = Player 2
    const firstPlayer = room.players[coinFlipResult];
    const secondPlayer = room.players[1 - coinFlipResult];

    // Assign White to firstPlayer (White always starts first in chess) and Black to secondPlayer
    firstPlayer.color = 'white';
    secondPlayer.color = 'black';

    // Initialize Game State
    room.gameState = {
      board: generateInitialBoard(room.dimensions),
      turn: 'white',
      history: [],
      timeRemaining: {
        white: room.turnTimer,
        black: room.turnTimer
      },
      lastMoveTime: Date.now(),
      coinFlipWinner: firstPlayer.name,
      coinFlipSide: Math.random() < 0.5 ? 'Heads' : 'Tails' // Just a visual fluff: Heads or Tails
    };

    // Emit Coin Flip Event
    io.to(roomId).emit('game-started-coin-flip', {
      room: room,
      winnerId: firstPlayer.id,
      winnerName: firstPlayer.name,
      side: room.gameState.coinFlipSide,
      players: room.players
    });

    console.log(`Game started in room ${roomId}. Coin flip winner: ${firstPlayer.name}`);
    io.emit('public-lobbies-updated');
  });

  // Handle player moves
  socket.on('make-move', (data) => {
    const { roomId, from, to, captured, special } = data;
    const room = rooms[roomId];

    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.color !== room.gameState.turn) {
      return socket.emit('error-msg', 'Sıra sizde değil!');
    }

    // Move logic
    const board = room.gameState.board;
    const piece = board[from];

    if (!piece) {
      return socket.emit('error-msg', 'Geçersiz hamle! Kaynak karede taş bulunamadı.');
    }

    // Log the move
    const moveLog = {
      player: player.name,
      color: player.color,
      piece: piece.type,
      from: from,
      to: to,
      captured: captured || null,
      special: special || null,
      timestamp: Date.now()
    };

    // Apply standard board changes
    delete board[from];
    
    // Check if there is a quantum superposition in special move
    if (special && special.type === 'quantum-split') {
      // Quantum superposition mode: piece exists in multiple targets
      board[to[0]] = { ...piece, superposition: to, hasMoved: true };
      board[to[1]] = { ...piece, superposition: to, hasMoved: true };
      moveLog.to = to.join(' | ');
    } else {
      // Normal move
      board[to] = { ...piece, hasMoved: true };
    }

    // Apply portal mode linkages if applicable
    if (special && special.type === 'portal-teleport') {
      const targetPortal = special.destination;
      board[targetPortal] = board[to];
      delete board[to];
      moveLog.to = `${to} -> Portal -> ${targetPortal}`;
    }

    // Apply gravity fallback
    if (special && special.type === 'gravity-collapse') {
      special.falls.forEach(fall => {
        const p = board[fall.from];
        if (p) {
          delete board[fall.from];
          board[fall.to] = { ...p, hasMoved: true };
        }
      });
    }

    room.gameState.history.push(moveLog);

    // Switch turns
    room.gameState.turn = room.gameState.turn === 'white' ? 'black' : 'white';
    room.gameState.lastMoveTime = Date.now();

    // Broadcast move to other player
    io.to(roomId).emit('move-made', {
      gameState: room.gameState,
      lastMove: moveLog
    });
  });

  // Resolve Quantum piece server-side to avoid client-side manipulation
  socket.on('quantum-resolve-request', (data) => {
    const { roomId, coords, triggerCoord } = data;
    const room = rooms[roomId];

    if (!room || room.status !== 'playing') return;

    const board = room.gameState.board;
    const piece = board[coords];

    if (!piece || !piece.superposition) return;

    // Server-side coin flip to collapse the superposition
    const targets = piece.superposition;
    const resolvedIndex = Math.random() < 0.5 ? 0 : 1;
    const keptCoord = targets[resolvedIndex];
    const removedCoord = targets[1 - resolvedIndex];

    // Modify board: concrete piece is kept at keptCoord, deleted from removedCoord
    const basePiece = { ...board[keptCoord] };
    delete basePiece.superposition;

    // Delete both placeholder locations
    delete board[targets[0]];
    delete board[targets[1]];

    // Place the concrete piece
    board[keptCoord] = basePiece;

    const collapseLog = {
      type: 'quantum-collapse',
      piece: basePiece.type,
      color: basePiece.color,
      kept: keptCoord,
      removed: removedCoord,
      trigger: triggerCoord || 'observation'
    };

    room.gameState.history.push({
      player: 'Quantum System',
      color: basePiece.color,
      piece: basePiece.type,
      from: 'Superposition',
      to: keptCoord,
      special: { type: 'quantum-collapse', log: collapseLog }
    });

    io.to(roomId).emit('quantum-resolved', {
      gameState: room.gameState,
      collapseLog: collapseLog
    });
  });

  // Handle in-game messages / chats
  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    const room = rooms[roomId];

    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(roomId).emit('chat-message-broadcast', {
      sender: player.name,
      color: player.color,
      message: message,
      timestamp: Date.now()
    });
  });

  // Handle user forfeit
  socket.on('forfeit-game', (data) => {
    const { roomId } = data;
    const room = rooms[roomId];

    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const winner = room.players.find(p => p.id !== socket.id);
    room.status = 'finished';

    io.to(roomId).emit('game-over', {
      reason: 'forfeit',
      winner: winner ? winner.name : 'Raki̇p',
      loser: player.name
    });

    console.log(`Game over in room ${roomId}: ${player.name} forfeited.`);
  });

  // Restart game request
  socket.on('restart-game-request', (data) => {
    const { roomId } = data;
    const room = rooms[roomId];

    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    // Reset status to waiting so host can update settings or start again
    room.status = 'waiting';
    room.gameState = null;

    io.to(roomId).emit('game-restarted', room);
    io.emit('public-lobbies-updated');
  });

  // Leave room or disconnect
  const handleLeaveRoom = (socketId) => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socketId);

      if (playerIndex !== -1) {
        const leavingPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        console.log(`Player ${leavingPlayer.name} left room ${roomId}`);

        if (room.players.length === 0) {
          // Room is empty, delete it
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          // Room still has players
          if (leavingPlayer.isHost) {
            // Reassign host
            room.players[0].isHost = true;
            room.players[0].color = 'white'; // Reassign color to reset room dynamics
          }

          if (room.status === 'playing') {
            room.status = 'finished';
            io.to(roomId).emit('game-over', {
              reason: 'disconnect',
              winner: room.players[0].name,
              loser: leavingPlayer.name
            });
          }

          io.to(roomId).emit('player-left', {
            room: room,
            playerName: leavingPlayer.name
          });
        }

        io.emit('public-lobbies-updated');
        break;
      }
    }
  };

  socket.on('leave-room', () => {
    handleLeaveRoom(socket.id);
  });

  socket.on('disconnect', () => {
    handleLeaveRoom(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  6D Chess server is running!`);
  console.log(`  Local Address: http://localhost:${PORT}`);
  console.log(`  IP is fully protected via Socket.io relay!`);
  console.log(`=============================================`);
});
