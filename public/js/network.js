/**
 * ==========================================================================
 * 6D Chess - WebSocket Network Coordinator
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Establish central Socket.io connection
  const socket = io();
  
  // 2. Initialize UI Controller
  const ui = new window.ChessUI(socket);

  // 3. Keep track of active in-game countdown clocks
  let timerInterval = null;

  const startCountdown = () => {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      const room = ui.activeRoom;
      if (!room || room.status !== 'playing' || !room.gameState) return;

      const state = room.gameState;
      if (room.turnTimer <= 0) return; // Infinite mode

      // Decrement active player's time
      const activeColor = state.turn;
      if (state.timeRemaining[activeColor] > 0) {
        state.timeRemaining[activeColor]--;
        
        // Update timer labels
        formatTimerLabel(ui.gamePWhiteTimer, state.timeRemaining.white);
        formatTimerLabel(ui.gamePBlackTimer, state.timeRemaining.black);

        // If time runs out, flag forfeit or auto-forfeit (handled simple client-side triggers or wait for server)
        if (state.timeRemaining[activeColor] === 0) {
          clearInterval(timerInterval);
          if (activeColor === ui.playerColor) {
            // Auto forfeit on timeout
            socket.emit('forfeit-game', { roomId: room.id });
          }
        }
      }
    }, 1000);
  };

  const stopCountdown = () => {
    if (timerInterval) clearInterval(timerInterval);
  };

  const formatTimerLabel = (element, seconds) => {
    if (seconds <= 0) {
      element.innerText = '00:00';
      return;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    element.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================================================
  // Socket Connection Handlers
  // ==========================================================================

  socket.on('connect', () => {
    console.log('Connected to server as client.');
    // Pull list of public lobbies immediately
    socket.emit('get-public-lobbies');
  });

  // Pull lobbies list updates
  socket.on('public-lobbies-updated', () => {
    socket.emit('get-public-lobbies');
  });

  socket.on('public-lobbies-list', (list) => {
    ui.renderLobbiesList(list);
  });

  // Host room creation success
  socket.on('room-created', (room) => {
    ui.activeRoom = room;
    ui.applyRoomSettings(room);
    ui.updateLobbyPlayers(room);
    
    // Clear chat logs
    ui.lobbyChatMessages.innerHTML = '';
    ui.appendChatMessage(ui.lobbyChatMessages, {
      sender: 'System',
      message: `Hoş geldiniz! Lobi ID: ${room.id}. Arkadaşlarınızla paylaşarak oyuna davet edebilirsiniz.`,
      timestamp: Date.now()
    });

    ui.switchScreen('screen-room');
  });

  // Guest room join success
  socket.on('room-joined', (room) => {
    ui.activeRoom = room;
    ui.applyRoomSettings(room);
    ui.updateLobbyPlayers(room);
    
    ui.lobbyChatMessages.innerHTML = '';
    ui.appendChatMessage(ui.lobbyChatMessages, {
      sender: 'System',
      message: `${room.name} lobisine katıldınız. Hazır olun!`,
      timestamp: Date.now()
    });

    ui.switchScreen('screen-room');
  });

  // Broadcast player joins
  socket.on('player-joined', ({ room, newPlayer }) => {
    ui.updateLobbyPlayers(room);
    
    ui.appendChatMessage(ui.lobbyChatMessages, {
      sender: 'System',
      message: `👤 ${newPlayer.name} lobiye katıldı!`,
      timestamp: Date.now()
    });
    
    window.SynthSound.play('move');
  });

  // Broadcast player departures
  socket.on('player-left', ({ room, playerName }) => {
    ui.updateLobbyPlayers(room);
    stopCountdown();

    if (ui.screens.room.classList.contains('active')) {
      ui.appendChatMessage(ui.lobbyChatMessages, {
        sender: 'System',
        message: `❌ ${playerName} lobiden ayrıldı.`,
        timestamp: Date.now()
      });
    }

    window.SynthSound.play('capture');
  });

  // Dynamic settings updates
  socket.on('room-settings-updated', (room) => {
    ui.applyRoomSettings(room);
    ui.updateLobbyPlayers(room);

    const chatBox = ui.screens.room.classList.contains('active') ? ui.lobbyChatMessages : ui.gameChatMessages;
    ui.appendChatMessage(chatBox, {
      sender: 'System',
      message: `⚙️ Oda ayarları güncellendi.`,
      timestamp: Date.now()
    });
    
    window.SynthSound.play('move');
  });

  // Virtual Coin Flip trigger!
  socket.on('game-started-coin-flip', (data) => {
    const { room } = data;
    ui.activeRoom = room;
    
    // Stop any previous timers
    stopCountdown();

    // Trigger physical coin flip screen overlay
    ui.playCoinFlipIntro(data, () => {
      // Transition to game board view on animation completes
      ui.setupGameSession(room);
      
      // Initialize countdown clocks
      if (room.turnTimer > 0) {
        formatTimerLabel(ui.gamePWhiteTimer, room.turnTimer);
        formatTimerLabel(ui.gamePBlackTimer, room.turnTimer);
        startCountdown();
      } else {
        ui.gamePWhiteTimer.innerText = '∞';
        ui.gamePBlackTimer.innerText = '∞';
      }

      // Append start log
      ui.appendChatMessage(ui.gameChatMessages, {
        sender: 'System',
        message: `🚀 Oyun başladı! İlk hamle sırası yazı tura kurasıyla Beyaz (${data.winnerName}) tarafına verildi.`,
        timestamp: Date.now()
      });
    });
  });

  // Relays moves in real-time
  socket.on('move-made', ({ gameState, lastMove }) => {
    ui.syncGameState(gameState);
    
    // Play correct move/capture sounds based on history log
    if (lastMove.special && lastMove.special.type === 'portal-teleport') {
      window.SynthSound.play('portal');
    } else if (lastMove.special && lastMove.special.type === 'gravity-collapse') {
      window.SynthSound.play('gravity');
    } else {
      window.SynthSound.play(lastMove.captured ? 'capture' : 'move');
    }

    // Refresh countdown timers
    if (ui.activeRoom.turnTimer > 0) {
      formatTimerLabel(ui.gamePWhiteTimer, gameState.timeRemaining.white);
      formatTimerLabel(ui.gamePBlackTimer, gameState.timeRemaining.black);
      startCountdown();
    }

    // Trigger local alarms if client's King is placed in Check
    const inCheck = window.NChess.isKingInCheck(ui.playerColor, gameState.board, ui.activeRoom.dimensions);
    if (inCheck) {
      window.SynthSound.play('check');
      ui.appendChatMessage(ui.gameChatMessages, {
        sender: 'System',
        message: `⚠️ Şah! ${ui.playerColor === 'white' ? 'Beyaz' : 'Siyah'} kral tehdit altında!`,
        timestamp: Date.now()
      });
    }

    // Checkmate solver
    const checkmateResult = window.NChess.checkGameEndState(
      gameState.turn, 
      gameState.board, 
      ui.activeRoom.dimensions, 
      ui.activeRoom.mode
    );

    if (checkmateResult === 'checkmate') {
      stopCountdown();
      const winnerName = gameState.turn === 'white' ? ui.gamePBlackName.innerText : ui.gamePWhiteName.innerText;
      const loserName = gameState.turn === 'white' ? ui.gamePWhiteName.innerText : ui.gamePBlackName.innerText;
      
      ui.triggerGameOver({
        reason: 'checkmate',
        winner: winnerName,
        loser: loserName
      });
    } else if (checkmateResult === 'stalemate') {
      stopCountdown();
      ui.overlayTitle.innerText = 'Pat!';
      ui.overlayDesc.innerText = 'Hamle kalmadı, oyun berabere bitti.';
      ui.boardOverlay.classList.add('active');
    }
  });

  // Quantum superposition collapse sync
  socket.on('quantum-resolved', ({ gameState, collapseLog }) => {
    ui.syncGameState(gameState);
    window.SynthSound.play('capture');

    // Reset countdowns
    if (ui.activeRoom.turnTimer > 0) {
      formatTimerLabel(ui.gamePWhiteTimer, gameState.timeRemaining.white);
      formatTimerLabel(ui.gamePBlackTimer, gameState.timeRemaining.black);
      startCountdown();
    }

    ui.appendChatMessage(ui.gameChatMessages, {
      sender: 'System',
      message: `🌀 Gözlem yapıldı! Kuantum taşı ${collapseLog.kept} koordinatına çöktü. Olası diğer konum (${collapseLog.removed}) yok oldu!`,
      timestamp: Date.now()
    });
  });

  // Socket chat relay
  socket.on('chat-message-broadcast', (data) => {
    const chatBox = ui.screens.room.classList.contains('active') ? ui.lobbyChatMessages : ui.gameChatMessages;
    ui.appendChatMessage(chatBox, data);
  });

  // Sync game finished triggers
  socket.on('game-over', (data) => {
    stopCountdown();
    ui.triggerGameOver(data);
  });

  // Return to Lobby after finished
  socket.on('game-restarted', (room) => {
    stopCountdown();
    ui.activeRoom = room;
    ui.boardOverlay.classList.remove('active');
    ui.applyRoomSettings(room);
    ui.updateLobbyPlayers(room);

    ui.lobbyChatMessages.innerHTML = '';
    ui.appendChatMessage(ui.lobbyChatMessages, {
      sender: 'System',
      message: `Oyun sıfırlandı. Lobi yeniden aktif.`,
      timestamp: Date.now()
    });

    ui.switchScreen('screen-room');
  });

  socket.on('error-msg', (msg) => {
    alert(msg);
  });
});
