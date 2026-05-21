/**
 * ==========================================================================
 * 6D Chess - UI Controller & Renderer
 * ==========================================================================
 */

// Synthesized Sound Generator using Web Audio API
const SynthSound = {
  ctx: null,
  
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  },

  play(type) {
    this.init();
    if (!this.ctx) return;
    
    // Resume context if suspended (browser security policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    switch (type) {
      case 'move':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(165, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'capture':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case 'portal':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;

      case 'gravity':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'coinflip':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;

      case 'coinflip-success':
        // A neat golden major chord chime
        const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        freqs.forEach((f, idx) => {
          const oscNode = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          
          oscNode.connect(gainNode);
          gainNode.connect(this.ctx.destination);
          
          oscNode.type = 'sine';
          oscNode.frequency.setValueAtTime(f, now + (idx * 0.06));
          gainNode.gain.setValueAtTime(0.08, now + (idx * 0.06));
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          
          oscNode.start(now + (idx * 0.06));
          oscNode.stop(now + 0.6);
        });
        break;

      case 'check':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        
        // Triple alarm beeps
        setTimeout(() => {
          this.play('move');
        }, 120);
        break;
    }
  }
};

// Futuristic sleek abstract chess pieces vector sets
const PIECE_SVGS = {
  P: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 20 L65 75 L35 75 Z" stroke-width="6" stroke-linejoin="round" />
        <circle cx="50" cy="35" r="10" stroke-width="5" />
      </svg>`,
  R: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 80 V45 L35 45 V25 H45 V35 H55 V25 H65 V45 L75 45 V80 Z" stroke-width="6" stroke-linejoin="round" />
        <rect x="35" y="55" width="30" height="12" rx="2" stroke-width="4" />
      </svg>`,
  N: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 80 V65 L45 35 L30 35 L45 15 L75 45 L55 55 L75 80 Z" stroke-width="6" stroke-linejoin="round" />
      </svg>`,
  B: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="45" r="22" stroke-width="6" />
        <path d="M50 15 V30 M35 45 H65 M50 67 V80" stroke-width="5" stroke-linecap="round" />
      </svg>`,
  Q: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="28" stroke-width="6" />
        <circle cx="50" cy="50" r="14" stroke-width="4" />
        <path d="M50 12 V22 M22 50 H12 M78 50 H88 M50 78 V88" stroke-width="5" stroke-linecap="round" />
      </svg>`,
  K: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 70 L35 30 L50 60 L65 30 L80 70 Z" stroke-width="6" stroke-linejoin="round" />
        <path d="M50 15 V30 M40 22 H60" stroke-width="5" stroke-linecap="round" />
        <line x1="25" y1="80" x2="75" y2="80" stroke-width="6" stroke-linecap="round" />
      </svg>`
};

class ChessUI {
  constructor(socket) {
    this.socket = socket;
    this.currentSlice = [0, 0, 0, 0]; // [z, w, v, u] currently viewed slice
    this.selectedCell = null; // Key e.g. "x,y,z,w,v,u"
    this.validMoves = []; // Array of destination keys
    this.playerColor = 'white'; // Default
    this.activeRoom = null;
    this.isMyTurn = false;
    this.canvasTimer = null;
    this.hoveredCell = null;

    this.initDOMElements();
    this.bindEvents();
    this.setupOverlayCanvas();
  }

  initDOMElements() {
    this.screens = {
      landing: document.getElementById('screen-landing'),
      room: document.getElementById('screen-room'),
      game: document.getElementById('screen-game')
    };

    // Landing Screen Controls
    this.nicknameInput = document.getElementById('input-nickname');
    this.btnOpenCreateModal = document.getElementById('btn-open-create-modal');
    this.btnRefreshLobbies = document.getElementById('btn-refresh-lobbies');
    this.lobbiesListBody = document.getElementById('lobbies-list-body');

    // Create Room Modal Controls
    this.modalCreateLobby = document.getElementById('modal-create-lobby');
    this.btnCreateLobbySubmit = document.getElementById('btn-create-lobby-submit');
    this.btnCreateLobbyCancel = document.getElementById('btn-create-lobby-cancel');
    this.createRoomNameInput = document.getElementById('input-create-room-name');
    this.selectCreatePreset = document.getElementById('select-create-preset');
    this.selectCreateMode = document.getElementById('select-create-mode');
    this.selectCreateTimer = document.getElementById('select-create-timer');
    this.checkCreatePrivate = document.getElementById('check-create-private');
    this.createPasswordGroup = document.getElementById('create-password-group');
    this.createPasswordInput = document.getElementById('input-create-password');
    this.createDimsWrapper = document.getElementById('create-dims-wrapper');

    // Sliders inside Create Modal
    this.createSliders = {
      x: document.getElementById('slider-create-x'),
      y: document.getElementById('slider-create-y'),
      z: document.getElementById('slider-create-z'),
      w: document.getElementById('slider-create-w'),
      v: document.getElementById('slider-create-v'),
      u: document.getElementById('slider-create-u')
    };

    this.createSliderVals = {
      x: document.getElementById('val-create-x'),
      y: document.getElementById('val-create-y'),
      z: document.getElementById('val-create-z'),
      w: document.getElementById('val-create-w'),
      v: document.getElementById('val-create-v'),
      u: document.getElementById('val-create-u')
    };

    // Room Lobby Controls
    this.roomNameDisplay = document.getElementById('room-name-display');
    this.roomIdDisplay = document.getElementById('room-id-display');
    this.btnLeaveRoom = document.getElementById('btn-leave-room');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.lobbyPlayersList = document.getElementById('lobby-players-list');
    this.lobbyChatMessages = document.getElementById('lobby-chat-messages');
    this.chatMessageInput = document.getElementById('input-chat-message');
    this.btnSendChat = document.getElementById('btn-send-chat');
    this.waitingMsg = document.getElementById('waiting-msg');

    // Room Lobby Settings (Host only editing)
    this.selectPreset = document.getElementById('select-preset');
    this.selectMode = document.getElementById('select-mode');
    this.selectTimer = document.getElementById('select-timer');
    this.checkPrivate = document.getElementById('check-private');
    this.passwordGroup = document.getElementById('password-group');
    this.lobbyPasswordInput = document.getElementById('input-lobby-password');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.customDimsWrapper = document.getElementById('custom-dims-wrapper');

    this.lobbySliders = {
      x: document.getElementById('slider-dim-x'),
      y: document.getElementById('slider-dim-y'),
      z: document.getElementById('slider-dim-z'),
      w: document.getElementById('slider-dim-w'),
      v: document.getElementById('slider-dim-v'),
      u: document.getElementById('slider-dim-u')
    };

    this.lobbySliderVals = {
      x: document.getElementById('val-dim-x'),
      y: document.getElementById('val-dim-y'),
      z: document.getElementById('val-dim-z'),
      w: document.getElementById('val-dim-w'),
      v: document.getElementById('val-dim-v'),
      u: document.getElementById('val-dim-u')
    };

    // Game Board Area
    this.mainChessBoard = document.getElementById('main-chess-board');
    this.lblCoordSlice = document.getElementById('lbl-coord-slice');
    this.canvasLinks = document.getElementById('canvas-links');
    this.boardOverlay = document.getElementById('board-overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayDesc = document.getElementById('overlay-desc');
    this.btnOverlayClose = document.getElementById('btn-overlay-close');
    this.turnAnnouncerText = document.getElementById('current-turn-player');

    // Sidebar Info
    this.gameActiveMode = document.getElementById('game-active-mode');
    this.gameRoomId = document.getElementById('game-room-id');
    this.gamePWhiteName = document.getElementById('game-p-white-name');
    this.gamePBlackName = document.getElementById('game-p-black-name');
    this.gamePWhiteTimer = document.getElementById('game-p-white-timer');
    this.gamePBlackTimer = document.getElementById('game-p-black-timer');
    this.btnGameForfeit = document.getElementById('btn-game-forfeit');
    this.btnGameLobby = document.getElementById('btn-game-lobby');
    this.gameMoveHistory = document.getElementById('game-move-history');
    this.gameChatMessages = document.getElementById('game-chat-messages');
    this.gameChatInput = document.getElementById('input-game-chat');
    this.btnSendGameChat = document.getElementById('btn-send-game-chat');

    // Dimension Step Geonavigator
    this.btnSteps = {
      zDown: document.getElementById('btn-step-z-down'),
      zUp: document.getElementById('btn-step-z-up'),
      wDown: document.getElementById('btn-step-w-down'),
      wUp: document.getElementById('btn-step-w-up'),
      vDown: document.getElementById('btn-step-v-down'),
      vUp: document.getElementById('btn-step-v-up'),
      uDown: document.getElementById('btn-step-u-down'),
      uUp: document.getElementById('btn-step-u-up')
    };

    this.lblNavVals = {
      z: document.getElementById('lbl-nav-z'),
      w: document.getElementById('lbl-nav-w'),
      v: document.getElementById('lbl-nav-v'),
      u: document.getElementById('lbl-nav-u')
    };

    this.groupNavSliders = {
      z: document.getElementById('group-nav-z'),
      w: document.getElementById('group-nav-w'),
      v: document.getElementById('group-nav-v'),
      u: document.getElementById('group-nav-u')
    };

    this.matrixBoardsContainer = document.getElementById('matrix-boards');

    // Password Join Modal
    this.modalPassword = document.getElementById('modal-password');
    this.joinPasswordInput = document.getElementById('input-join-password');
    this.btnPasswordSubmit = document.getElementById('btn-password-submit');
    this.btnPasswordCancel = document.getElementById('btn-password-cancel');

    // Coin Flip Animation Elements
    this.coinflipScreen = document.getElementById('coinflip-screen');
    this.physicalCoin = document.getElementById('physical-coin');
    this.coinflipResultBox = document.getElementById('coinflip-result-box');
    this.coinflipResultText = document.getElementById('coinflip-result-text');
    this.coinflipResultDesc = document.getElementById('coinflip-result-desc');
  }

  // View Screen Toggle
  switchScreen(screenName) {
    Object.values(this.screens).forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Quick delay for neat transitions
    setTimeout(() => {
      Object.keys(this.screens).forEach(key => {
        if (key === screenName) {
          this.screens[key].classList.add('active');
        }
      });
    }, 50);
  }

  bindEvents() {
    // 1. Landing Screen Event Handlers
    this.btnOpenCreateModal.onclick = () => {
      this.createRoomNameInput.value = `${this.nicknameInput.value}'ın Dünyası`;
      this.modalCreateLobby.classList.add('active');
    };

    this.btnRefreshLobbies.onclick = () => {
      this.socket.emit('get-public-lobbies');
    };

    // 2. Create Modal Event Handlers
    this.btnCreateLobbyCancel.onclick = () => {
      this.modalCreateLobby.classList.remove('active');
    };

    this.checkCreatePrivate.onchange = () => {
      this.createPasswordGroup.style.display = this.checkCreatePrivate.checked ? 'block' : 'none';
    };

    // Bind slider labels for Create Modal
    Object.keys(this.createSliders).forEach(key => {
      this.createSliders[key].oninput = () => {
        this.createSliderVals[key].innerText = this.createSliders[key].value;
      };
    });

    this.selectCreatePreset.onchange = () => {
      const preset = this.selectCreatePreset.value;
      if (preset === 'custom') {
        this.createDimsWrapper.style.display = 'grid';
      } else {
        this.createDimsWrapper.style.display = 'none';
        
        // Preset values X, Y, Z, W, V, U
        const presets = {
          '2d': [8, 8, 1, 1, 1, 1],
          '3d': [5, 5, 3, 1, 1, 1],
          '4d': [4, 4, 2, 2, 1, 1],
          '5d': [4, 4, 2, 2, 2, 1],
          '6d': [4, 4, 2, 2, 2, 2]
        };

        const vals = presets[preset];
        const keys = ['x', 'y', 'z', 'w', 'v', 'u'];
        keys.forEach((k, idx) => {
          this.createSliders[k].value = vals[idx];
          this.createSliderVals[k].innerText = vals[idx];
        });
      }
    };

    // Submit Create Room Form
    this.btnCreateLobbySubmit.onclick = () => {
      const playerName = this.nicknameInput.value.trim() || 'Gezgin';
      const name = this.createRoomNameInput.value.trim() || `${playerName}'ın Lobilisi`;
      const isPrivate = this.checkCreatePrivate.checked;
      const password = this.createPasswordInput.value.trim();
      const turnTimer = parseInt(this.selectCreateTimer.value);
      const mode = this.selectCreateMode.value;
      
      const dims = [
        parseInt(this.createSliders.x.value),
        parseInt(this.createSliders.y.value),
        parseInt(this.createSliders.z.value),
        parseInt(this.createSliders.w.value),
        parseInt(this.createSliders.v.value),
        parseInt(this.createSliders.u.value)
      ];

      this.socket.emit('create-room', {
        playerName,
        name,
        isPrivate,
        password,
        turnTimer,
        mode,
        dimensions: dims
      });

      this.modalCreateLobby.classList.remove('active');
    };

    // 3. Room Lobby Event Handlers
    this.btnLeaveRoom.onclick = () => {
      this.socket.emit('leave-room');
      this.switchScreen('landing');
      this.socket.emit('get-public-lobbies');
    };

    this.checkPrivate.onchange = () => {
      this.passwordGroup.style.display = this.checkPrivate.checked ? 'block' : 'none';
    };

    Object.keys(this.lobbySliders).forEach(key => {
      this.lobbySliders[key].oninput = () => {
        this.lobbySliderVals[key].innerText = this.lobbySliders[key].value;
      };
    });

    this.selectPreset.onchange = () => {
      const preset = this.selectPreset.value;
      if (preset === 'custom') {
        this.customDimsWrapper.style.display = 'grid';
      } else {
        this.customDimsWrapper.style.display = 'none';
        const presets = {
          '2d': [8, 8, 1, 1, 1, 1],
          '3d': [5, 5, 3, 1, 1, 1],
          '4d': [4, 4, 2, 2, 1, 1],
          '5d': [4, 4, 2, 2, 2, 1],
          '6d': [4, 4, 2, 2, 2, 2]
        };

        const vals = presets[preset];
        const keys = ['x', 'y', 'z', 'w', 'v', 'u'];
        keys.forEach((k, idx) => {
          this.lobbySliders[k].value = vals[idx];
          this.lobbySliderVals[k].innerText = vals[idx];
        });
      }
    };

    this.btnSaveSettings.onclick = () => {
      if (!this.activeRoom) return;

      const name = this.roomNameDisplay.innerText;
      const isPrivate = this.checkPrivate.checked;
      const password = this.lobbyPasswordInput.value.trim();
      const turnTimer = parseInt(this.selectTimer.value);
      const mode = this.selectMode.value;

      const dims = [
        parseInt(this.lobbySliders.x.value),
        parseInt(this.lobbySliders.y.value),
        parseInt(this.lobbySliders.z.value),
        parseInt(this.lobbySliders.w.value),
        parseInt(this.lobbySliders.v.value),
        parseInt(this.lobbySliders.u.value)
      ];

      this.socket.emit('update-room-settings', {
        roomId: this.activeRoom.id,
        name,
        isPrivate,
        password,
        turnTimer,
        mode,
        dimensions: dims
      });
    };

    this.btnStartGame.onclick = () => {
      if (!this.activeRoom) return;
      this.socket.emit('start-game', { roomId: this.activeRoom.id });
    };

    // Chat Sends
    const sendLobbyMsg = () => {
      const msg = this.chatMessageInput.value.trim();
      if (!msg || !this.activeRoom) return;
      this.socket.emit('chat-message', { roomId: this.activeRoom.id, message: msg });
      this.chatMessageInput.value = '';
    };

    this.btnSendChat.onclick = sendLobbyMsg;
    this.chatMessageInput.onkeydown = (e) => {
      if (e.key === 'Enter') sendLobbyMsg();
    };

    // 4. Game Screen Control Handlers
    this.btnGameForfeit.onclick = () => {
      if (!confirm('Oyundan çekilmek istediğinize emin misiniz?')) return;
      this.socket.emit('forfeit-game', { roomId: this.activeRoom.id });
    };

    this.btnGameLobby.onclick = () => {
      this.socket.emit('restart-game-request', { roomId: this.activeRoom.id });
    };

    const sendGameMsg = () => {
      const msg = this.gameChatInput.value.trim();
      if (!msg || !this.activeRoom) return;
      this.socket.emit('chat-message', { roomId: this.activeRoom.id, message: msg });
      this.gameChatInput.value = '';
    };

    this.btnSendGameChat.onclick = sendGameMsg;
    this.gameChatInput.onkeydown = (e) => {
      if (e.key === 'Enter') sendGameMsg();
    };

    this.btnOverlayClose.onclick = () => {
      this.boardOverlay.classList.remove('active');
    };

    // Geonavigation Step Buttons
    const modifyDimension = (dimIdx, offset) => {
      if (!this.activeRoom) return;
      
      const maxVal = this.activeRoom.dimensions[dimIdx + 2] || 1;
      let nextVal = this.currentSlice[dimIdx] + offset;
      
      if (nextVal < 0) nextVal = maxVal - 1;
      if (nextVal >= maxVal) nextVal = 0;

      this.currentSlice[dimIdx] = nextVal;
      this.updateNavigatorUI();
      this.renderMainBoard();
      this.renderMiniBoards();
      this.redrawCanvas();
    };

    this.btnSteps.zDown.onclick = () => modifyDimension(0, -1);
    this.btnSteps.zUp.onclick = () => modifyDimension(0, 1);
    this.btnSteps.wDown.onclick = () => modifyDimension(1, -1);
    this.btnSteps.wUp.onclick = () => modifyDimension(1, 1);
    this.btnSteps.vDown.onclick = () => modifyDimension(2, -1);
    this.btnSteps.vUp.onclick = () => modifyDimension(2, 1);
    this.btnSteps.uDown.onclick = () => modifyDimension(3, -1);
    this.btnSteps.uUp.onclick = () => modifyDimension(3, 1);

    // Dynamic Canvas resizing on windows resize
    window.onresize = () => this.resizeCanvas();
  }

  // Setup SVGs and canvas sizing for cross-dimension links
  setupOverlayCanvas() {
    this.canvasCtx = this.canvasLinks.getContext('2d');
    this.resizeCanvas();
  }

  resizeCanvas() {
    const parent = this.canvasLinks.parentElement;
    this.canvasLinks.width = parent.clientWidth;
    this.canvasLinks.height = parent.clientHeight;
  }

  // Trigger vector lines redraw
  redrawCanvas() {
    if (this.canvasTimer) clearTimeout(this.canvasTimer);
    
    // Defer redraw slightly to let browser complete cell layouts
    this.canvasTimer = setTimeout(() => {
      this.drawHyperLines();
    }, 80);
  }

  // Render list of active lobbies in the Landing tab
  renderLobbiesList(lobbies) {
    this.lobbiesListBody.innerHTML = '';
    
    if (lobbies.length === 0) {
      this.lobbiesListBody.innerHTML = `
        <tr class="empty-state">
          <td colspan="5">Aktif genel lobi bulunamadı. Hemen yeni bir lobi oluşturun!</td>
        </tr>
      `;
      document.getElementById('lobby-count').innerText = `0 Oda Aktif`;
      return;
    }

    document.getElementById('lobby-count').innerText = `${lobbies.length} Oda Aktif`;

    lobbies.forEach(lobby => {
      const tr = document.createElement('tr');
      
      const formatDims = lobby.dimensions.join('x');
      const formattedMode = lobby.mode === 'classic' ? 'Klasik 6D' :
                            lobby.mode === 'portal' ? 'Portal Warp' :
                            lobby.mode === 'quantum' ? 'Quantum' : 'Yerçekimi';

      tr.innerHTML = `
        <td style="font-weight: 600;">${lobby.name}</td>
        <td><span class="lobby-dim-badge">${formatDims}</span></td>
        <td><span class="lobby-mode-badge">${formattedMode}</span></td>
        <td>👤 ${lobby.playersCount}/2</td>
        <td>
          <button class="btn btn-secondary btn-sm btn-join" data-id="${lobby.id}">
            Katıl
          </button>
        </td>
      `;

      // Bind Join button
      tr.querySelector('.btn-join').onclick = () => {
        this.promptPasswordJoin(lobby.id);
      };

      this.lobbiesListBody.appendChild(tr);
    });
  }

  // Handles joining a room, prompt password if it is private
  promptPasswordJoin(roomId) {
    this.socket.emit('join-room', {
      roomId: roomId,
      playerName: this.nicknameInput.value.trim() || 'Gezgin',
      password: ''
    });
  }

  // Populate players inside the Lobby screen
  updateLobbyPlayers(room) {
    this.activeRoom = room;
    this.lobbyPlayersList.innerHTML = '';
    
    // Find current client node in player list
    const myPlayer = room.players.find(p => p.id === this.socket.id);
    if (myPlayer) {
      this.playerColor = myPlayer.color;
    }

    room.players.forEach(p => {
      const div = document.createElement('div');
      div.className = 'player-node';
      
      const colorClass = p.color === 'white' ? 'white' : 'black';
      const isMeTag = p.id === this.socket.id ? ' (Siz)' : '';
      const hostBadge = p.isHost ? '<span class="player-role-badge">Host</span>' : '';

      div.innerHTML = `
        <div class="player-identity">
          <span class="player-color-dot ${colorClass}"></span>
          <span class="player-name-text">${p.name}${isMeTag}</span>
        </div>
        ${hostBadge}
      `;

      this.lobbyPlayersList.appendChild(div);
    });

    // Check if game can be started
    const amIHost = myPlayer && myPlayer.isHost;
    if (room.players.length === 2) {
      this.waitingMsg.style.display = 'none';
      if (amIHost) {
        this.btnStartGame.disabled = false;
      }
    } else {
      this.waitingMsg.style.display = 'block';
      this.btnStartGame.disabled = true;
    }

    // Toggle settings fields based on Host permissions
    this.setLobbySettingsFormEditable(amIHost);
  }

  setLobbySettingsFormEditable(editable) {
    this.selectPreset.disabled = !editable;
    this.selectMode.disabled = !editable;
    this.selectTimer.disabled = !editable;
    this.checkPrivate.disabled = !editable;
    this.lobbyPasswordInput.disabled = !editable;
    this.btnSaveSettings.style.display = editable ? 'block' : 'none';

    Object.keys(this.lobbySliders).forEach(k => {
      this.lobbySliders[k].disabled = !editable;
    });
  }

  // Update room fields globally on settings changes
  applyRoomSettings(room) {
    this.activeRoom = room;
    this.roomNameDisplay.innerText = room.name;
    this.roomIdDisplay.innerText = `ID: ${room.id}`;
    
    // Set settings values on UI
    this.selectMode.value = room.mode;
    this.selectTimer.value = room.turnTimer;
    this.checkPrivate.checked = room.isPrivate;
    this.passwordGroup.style.display = room.isPrivate ? 'block' : 'none';
    this.lobbyPasswordInput.value = room.password || '';

    // Check presets mapping
    let matchingPreset = 'custom';
    const dims = room.dimensions;
    const presets = {
      '2d': [8, 8, 1, 1, 1, 1],
      '3d': [5, 5, 3, 1, 1, 1],
      '4d': [4, 4, 2, 2, 1, 1],
      '5d': [4, 4, 2, 2, 2, 1],
      '6d': [4, 4, 2, 2, 2, 2]
    };

    for (const key in presets) {
      if (window.NChess.isEqual(presets[key], dims)) {
        matchingPreset = key;
        break;
      }
    }

    this.selectPreset.value = matchingPreset;
    if (matchingPreset === 'custom') {
      this.customDimsWrapper.style.display = 'grid';
    } else {
      this.customDimsWrapper.style.display = 'none';
    }

    const keys = ['x', 'y', 'z', 'w', 'v', 'u'];
    keys.forEach((k, idx) => {
      this.lobbySliders[k].value = dims[idx];
      this.lobbySliderVals[k].innerText = dims[idx];
    });
  }

  // Display the grand Coin Flip animation before entering the game
  playCoinFlipIntro(data, onDone) {
    const { winnerName, winnerId, side, room } = data;
    this.activeRoom = room;

    // Reset coin classes
    this.physicalCoin.className = 'coin';
    this.coinflipResultBox.classList.remove('show');
    
    // Set labels
    this.coinflipResultText.innerText = `${side === 'Heads' ? 'Yazı' : 'Tura'} Geldi!`;
    const colorWon = winnerId === this.socket.id ? 'BEYAZ' : 'SİYAH';
    this.coinflipResultDesc.innerHTML = `Kurayı <strong>${winnerName}</strong> kazandı. <br>Renk: <strong>${colorWon}</strong> (İlk Sıra)`;

    // Open Screen Overlay
    this.coinflipScreen.classList.add('active');

    // Trigger tick sound sequence
    let count = 0;
    const tickInterval = setInterval(() => {
      SynthSound.play('coinflip');
      count++;
      if (count > 15) clearInterval(tickInterval);
    }, 150);

    // Start spin animation after quick layout mount
    setTimeout(() => {
      const finalClass = side === 'Heads' ? 'flip-heads' : 'flip-tails';
      this.physicalCoin.classList.add(finalClass);
    }, 200);

    // Display winner card in 2.2 seconds
    setTimeout(() => {
      clearInterval(tickInterval);
      SynthSound.play('coinflip-success');
      this.coinflipResultBox.classList.add('show');
    }, 2200);

    // Fade out and enter game after 4.5 seconds
    setTimeout(() => {
      this.coinflipScreen.classList.remove('active');
      if (onDone) onDone();
    }, 4800);
  }

  // Initialize Game Screen Dashboard
  setupGameSession(room) {
    this.activeRoom = room;
    
    // Set player profiles
    const myPlayer = room.players.find(p => p.id === this.socket.id);
    if (myPlayer) {
      this.playerColor = myPlayer.color;
    }

    const hostPlayer = room.players.find(p => p.isHost);
    const guestPlayer = room.players.find(p => !p.isHost);

    // Relabel based on colors assigned by flip
    const whitePlayer = room.players.find(p => p.color === 'white');
    const blackPlayer = room.players.find(p => p.color === 'black');

    this.gamePWhiteName.innerText = whitePlayer ? whitePlayer.name : 'Beyaz Oyuncu';
    this.gamePBlackName.innerText = blackPlayer ? blackPlayer.name : 'Siyah Oyuncu';

    this.gameActiveMode.innerText = room.mode === 'classic' ? 'KLASİK 6D' :
                                    room.mode === 'portal' ? 'PORTAL WARP' :
                                    room.mode === 'quantum' ? 'QUANTUM' : 'YERÇEKİMİ';
    this.gameRoomId.innerText = `ID: ${room.id}`;

    // Reset step variables to 0
    this.currentSlice = [0, 0, 0, 0];
    
    // Hide unused dimension sliders
    const dims = room.dimensions;
    const hideOrShow = (elem, size) => {
      elem.style.display = size > 1 ? 'flex' : 'none';
    };

    hideOrShow(this.groupNavSliders.z, dims[2]);
    hideOrShow(this.groupNavSliders.w, dims[3]);
    hideOrShow(this.groupNavSliders.v, dims[4]);
    hideOrShow(this.groupNavSliders.u, dims[5]);

    // Update Turn Indicator & Board
    this.syncGameState(room.gameState);
    
    this.switchScreen('screen-game');
    this.redrawCanvas();
  }

  syncGameState(gameState) {
    if (!this.activeRoom || !gameState) return;
    
    this.activeRoom.gameState = gameState;
    
    // Toggle active turn colors
    const isWhiteTurn = gameState.turn === 'white';
    
    document.getElementById('p-white-card').className = isWhiteTurn ? 'player-vs-node white-side active-turn' : 'player-vs-node white-side';
    document.getElementById('p-black-card').className = !isWhiteTurn ? 'player-vs-node black-side active-turn' : 'player-vs-node black-side';

    this.isMyTurn = this.playerColor === gameState.turn;
    
    const turnName = gameState.turn === 'white' ? 'Beyaz' : 'Siyah';
    const amITurn = this.isMyTurn ? ' (Siz)' : '';
    this.turnAnnouncerText.innerText = `${turnName}${amITurn}`;

    // Draw boards
    this.updateNavigatorUI();
    this.renderMainBoard();
    this.renderMiniBoards();
    this.updateHistoryList(gameState.history);

    // Close overlays if active and game has resumed
    this.btnGameLobby.style.display = 'none';

    this.redrawCanvas();
  }

  updateNavigatorUI() {
    this.lblNavVals.z.innerText = this.currentSlice[0];
    this.lblNavVals.w.innerText = this.currentSlice[1];
    this.lblNavVals.v.innerText = this.currentSlice[2];
    this.lblNavVals.u.innerText = this.currentSlice[3];

    // Label slice tag
    this.lblCoordSlice.innerText = `[${this.currentSlice.join(', ')}]`;
  }

  // Render currently selected 2D slice
  renderMainBoard() {
    if (!this.activeRoom || !this.activeRoom.gameState) return;

    const boardState = this.activeRoom.gameState.board;
    const dims = this.activeRoom.dimensions;
    const width = dims[0];
    const height = dims[1];

    this.mainChessBoard.innerHTML = '';
    this.mainChessBoard.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    this.mainChessBoard.style.gridTemplateRows = `repeat(${height}, 1fr)`;

    // Render cells in inverted row sequence for White vs Black views
    const rowRange = [];
    if (this.playerColor === 'black') {
      // Invert row sequence for black perspective (rank 0 bottom, etc.)
      for (let y = 0; y < height; y++) rowRange.push(y);
    } else {
      for (let y = height - 1; y >= 0; y--) rowRange.push(y);
    }

    rowRange.forEach(y => {
      for (let x = 0; x < width; x++) {
        const cell = document.createElement('div');
        const isDark = (x + y) % 2 === 0;
        cell.className = `board-cell ${isDark ? 'dark' : 'light'}`;
        
        const cellKey = `${x},${y},${this.currentSlice.join(',')}`;
        cell.dataset.key = cellKey;

        // Render portals markings
        if (this.activeRoom.mode === 'portal' && window.NChess.isPortal([x,y], dims)) {
          cell.classList.add('portal-cell');
        }

        // Render gravity support warnings
        if (this.activeRoom.mode === 'gravity' && this.currentSlice[0] > 0) {
          // Check if cell has no support directly below
          const supportKey = `${x},${y},${this.currentSlice[0] - 1},${this.currentSlice.slice(1).join(',')}`;
          const hasSupport = !!boardState[supportKey];
          if (!hasSupport && boardState[cellKey]) {
            cell.classList.add('gravity-unsupported');
          }
        }

        // Highlight selection and moves
        if (this.selectedCell === cellKey) {
          cell.classList.add('selected');
        }

        if (this.validMoves.includes(cellKey)) {
          const hasEnemy = boardState[cellKey] && boardState[cellKey].color !== this.playerColor;
          cell.classList.add(hasEnemy ? 'valid-capture' : 'valid-move');
        }

        // Render piece
        const piece = boardState[cellKey];
        if (piece) {
          const pieceDiv = document.createElement('div');
          pieceDiv.className = `chess-piece ${piece.color}`;
          
          // Special Quantum style
          if (piece.superposition) {
            pieceDiv.classList.add('quantum');
          }

          pieceDiv.innerHTML = PIECE_SVGS[piece.type] || '';
          cell.appendChild(pieceDiv);
        }

        // Hover bindings for drawing high dimensional links
        cell.onmouseenter = () => {
          this.hoveredCell = cellKey;
          this.redrawCanvas();
        };

        cell.onmouseleave = () => {
          this.hoveredCell = null;
          this.redrawCanvas();
        };

        // Click handler
        cell.onclick = () => this.handleCellClick(cellKey);

        this.mainChessBoard.appendChild(cell);
      }
    });
  }

  // Render matrices of mini thumbnail boards in the navigator
  renderMiniBoards() {
    if (!this.activeRoom || !this.activeRoom.gameState) return;

    this.matrixBoardsContainer.innerHTML = '';
    const dims = this.activeRoom.dimensions;
    const boardState = this.activeRoom.gameState.board;

    // Total counts in each navigation dimensions
    const sz = dims[2] || 1;
    const sw = dims[3] || 1;
    const sv = dims[4] || 1;
    const su = dims[5] || 1;

    const width = dims[0];
    const height = dims[1];

    // Check if currently selected piece has jumps to other boards
    const outerTargetBoards = [];
    if (this.selectedCell) {
      this.validMoves.forEach(mKey => {
        const parsed = window.NChess.parseKey(mKey);
        const outerSlice = parsed.slice(2).join(',');
        if (outerSlice !== this.currentSlice.join(',') && !outerTargetBoards.includes(outerSlice)) {
          outerTargetBoards.push(outerSlice);
        }
      });
    }

    // Loop through all outer slice coordinates
    for (let u = 0; u < su; u++) {
      for (let v = 0; v < sv; v++) {
        for (let w = 0; w < sw; w++) {
          for (let z = 0; z < sz; z++) {
            const sliceKey = `${z},${w},${v},${u}`;
            
            const card = document.createElement('div');
            card.className = 'mini-board-card';
            card.dataset.slice = sliceKey;

            const isCurrent = z === this.currentSlice[0] && 
                              w === this.currentSlice[1] && 
                              v === this.currentSlice[2] && 
                              u === this.currentSlice[3];

            if (isCurrent) {
              card.classList.add('active-slice');
            }

            if (outerTargetBoards.includes(sliceKey)) {
              card.classList.add('highlight-jump');
            }

            // Create micromesh
            const grid = document.createElement('div');
            grid.className = 'mini-board-grid';
            grid.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
            grid.style.gridTemplateRows = `repeat(${height}, 1fr)`;

            // Populate dots
            for (let y = height - 1; y >= 0; y--) {
              for (let x = 0; x < width; x++) {
                const cell = document.createElement('div');
                cell.className = 'mini-cell';
                if ((x + y) % 2 === 0) cell.classList.add('dark');

                const pieceKey = `${x},${y},${sliceKey}`;
                const piece = boardState[pieceKey];
                
                if (piece) {
                  const colorClass = piece.color === 'white' ? 'has-piece-white' : 'has-piece-black';
                  cell.classList.add(colorClass);
                }
                grid.appendChild(cell);
              }
            }

            // Label tag under card
            const label = document.createElement('div');
            label.className = 'mini-board-label';
            label.innerText = `[${sliceKey}]`;

            card.appendChild(grid);
            card.appendChild(label);

            // Click shifts view
            card.onclick = () => {
              this.currentSlice = [z, w, v, u];
              this.updateNavigatorUI();
              this.renderMainBoard();
              this.renderMiniBoards();
              this.redrawCanvas();
            };

            this.matrixBoardsContainer.appendChild(card);
          }
        }
      }
    }
  }

  // Connect cells with glowing bezier vector threads across boards
  drawHyperLines() {
    if (!this.canvasCtx) return;
    
    // Clear canvas
    this.canvasCtx.clearRect(0, 0, this.canvasLinks.width, this.canvasLinks.height);

    // Draw only if a cell is selected/hovered to prevent visual clutter
    const activeKey = this.hoveredCell || this.selectedCell;
    if (!activeKey) return;

    const boardState = this.activeRoom?.gameState?.board;
    if (!boardState) return;

    const moves = this.validMoves;
    if (moves.length === 0) return;

    // Locate source element on board
    const srcCellEl = this.mainChessBoard.querySelector(`[data-key="${activeKey}"]`);
    if (!srcCellEl) return;

    const srcRect = srcCellEl.getBoundingClientRect();
    const canvasRect = this.canvasLinks.getBoundingClientRect();

    // Source coordinates on canvas
    const x1 = srcRect.left - canvasRect.left + srcRect.width / 2;
    const y1 = srcRect.top - canvasRect.top + srcRect.height / 2;

    moves.forEach(mKey => {
      const parsed = window.NChess.parseKey(mKey);
      const outerSlice = parsed.slice(2).join(',');
      
      // If valid move is on ANOTHER board, connect to the Navigator card
      if (outerSlice !== this.currentSlice.join(',')) {
        const miniCardEl = this.matrixBoardsContainer.querySelector(`[data-slice="${outerSlice}"]`);
        if (miniCardEl) {
          const cardRect = miniCardEl.getBoundingClientRect();
          
          const x2 = cardRect.left - canvasRect.left + cardRect.width / 2;
          const y2 = cardRect.top - canvasRect.top + cardRect.height / 2;

          // Draw neon cyan/purple connector curve
          this.canvasCtx.beginPath();
          this.canvasCtx.moveTo(x1, y1);
          
          // Control points for smooth organic sweep curves
          const cpX = (x1 + x2) / 2;
          const cpY = Math.min(y1, y2) - 60; // arching upward
          
          this.canvasCtx.quadraticCurveTo(cpX, cpY, x2, y2);
          
          this.canvasCtx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
          this.canvasCtx.lineWidth = 3;
          this.canvasCtx.shadowBlur = 8;
          this.canvasCtx.shadowColor = '#00f0ff';
          this.canvasCtx.stroke();
          
          this.canvasCtx.shadowBlur = 0; // Reset shadow
        }
      } else if (this.hoveredCell === mKey || this.selectedCell === mKey) {
        // Draw inside same board to connect source with target cells
        const targetCellEl = this.mainChessBoard.querySelector(`[data-key="${mKey}"]`);
        if (targetCellEl) {
          const targetRect = targetCellEl.getBoundingClientRect();
          const x2 = targetRect.left - canvasRect.left + targetRect.width / 2;
          const y2 = targetRect.top - canvasRect.top + targetRect.height / 2;

          this.canvasCtx.beginPath();
          this.canvasCtx.moveTo(x1, y1);
          this.canvasCtx.lineTo(x2, y2);
          this.canvasCtx.strokeStyle = 'rgba(255, 0, 123, 0.35)';
          this.canvasCtx.lineWidth = 2;
          this.canvasCtx.stroke();
        }
      }
    });
  }

  // Interactivity clicks
  handleCellClick(cellKey) {
    if (!this.isMyTurn) return;

    const boardState = this.activeRoom.gameState.board;
    const piece = boardState[cellKey];

    // 1. Move Execution: Clicked on a valid target square
    if (this.validMoves.includes(cellKey)) {
      const from = this.selectedCell;
      const to = cellKey;
      const targetPiece = boardState[to];

      // Detect special mechanics
      let special = null;

      // Portal warp trigger
      if (this.activeRoom.mode === 'portal') {
        const dims = this.activeRoom.dimensions;
        const parsedTo = window.NChess.parseKey(to);
        if (window.NChess.isPortal(parsedTo, dims)) {
          const width = dims[0];
          const height = dims[1];
          const warpCoords = [...parsedTo];
          if (parsedTo[0] === 0 && parsedTo[1] === 0) {
            warpCoords[0] = width - 1;
            warpCoords[1] = height - 1;
          } else {
            warpCoords[0] = 0;
            warpCoords[1] = 0;
          }
          special = {
            type: 'portal-teleport',
            destination: window.NChess.getKey(warpCoords)
          };
          SynthSound.play('portal');
        }
      }

      // Gravity fall triggers
      if (this.activeRoom.mode === 'gravity') {
        // Simulate local board state to scan for falls
        const simulated = window.NChess.simulateMove(boardState, from, to);
        const falls = window.NChess.calculateGravityFalls(simulated, this.activeRoom.dimensions);
        if (falls.length > 0) {
          special = {
            type: 'gravity-collapse',
            falls: falls
          };
          SynthSound.play('gravity');
        }
      }

      // Standard / normal move sends
      if (!special) SynthSound.play(targetPiece ? 'capture' : 'move');

      this.socket.emit('make-move', {
        roomId: this.activeRoom.id,
        from: from,
        to: to,
        captured: targetPiece ? targetPiece.type : null,
        special: special
      });

      // Clear highlights
      this.selectedCell = null;
      this.validMoves = [];
      this.renderMainBoard();
      this.renderMiniBoards();
      this.redrawCanvas();
      return;
    }

    // 2. Piece selection: Clicked on one of own pieces
    if (piece && piece.color === this.playerColor) {
      
      // If Quantum mode, check if clicking superposition piece to resolve it
      if (this.activeRoom.mode === 'quantum' && piece.superposition) {
        // Must resolve before moving!
        if (confirm('Bu kuantum parçasının gerçek konumunu belirlemek için gözlem yapılsın mı?')) {
          this.socket.emit('quantum-resolve-request', {
            roomId: this.activeRoom.id,
            coords: cellKey,
            triggerCoord: cellKey
          });
        }
        return;
      }

      // Standard select
      this.selectedCell = cellKey;
      this.validMoves = window.NChess.getValidMoves(cellKey, boardState, this.activeRoom.dimensions, this.activeRoom.mode);

      // Quantum Mode bonus: if Quantum, player can choose to perform a "Quantum Split" instead of a regular move!
      // This is enabled if they shift-click or double click, or we can prompt them when they try to move.
      // Let's implement a neat split option: if they select a piece, and click another piece of theirs, they change selection.
      // To perform a quantum split, let's allow them to pick TWO valid cells when they right-click or hold Ctrl!
      // Let's keep it simple: we can give them an option: if they click a valid move, they move normally.

      this.renderMainBoard();
      this.renderMiniBoards();
      this.redrawCanvas();
      
      SynthSound.play('move');
      return;
    }

    // 3. Clicked empty square without a valid move: clear selection
    this.selectedCell = null;
    this.validMoves = [];
    this.renderMainBoard();
    this.renderMiniBoards();
    this.redrawCanvas();
  }

  // Update Sidebar Moves history logs
  updateHistoryList(history) {
    this.gameMoveHistory.innerHTML = '';
    
    if (history.length === 0) {
      this.gameMoveHistory.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">Hamle yapılmadı.</div>';
      return;
    }

    history.forEach((log, index) => {
      const node = document.createElement('div');
      node.className = 'history-node';
      
      const actorClass = log.color === 'white' ? 'white' : 'black';
      const capTag = log.captured ? `x${log.captured}` : '';
      
      // Clean target display
      let toDisplay = log.to;
      if (log.special && log.special.type === 'quantum-collapse') {
        toDisplay = `Collap ${log.special.log.kept}`;
      }

      node.innerHTML = `
        <span class="move-actor ${actorClass}">${index + 1}. ${log.player}</span>
        <span class="move-details">${log.piece}${capTag} ➔ ${toDisplay}</span>
      `;
      
      this.gameMoveHistory.appendChild(node);
    });

    // Auto scroll bottom
    this.gameMoveHistory.scrollTop = this.gameMoveHistory.scrollHeight;
  }

  // Game over overlay displays
  triggerGameOver(data) {
    const { reason, winner, loser } = data;
    
    this.overlayTitle.innerText = reason === 'forfeit' ? 'Çekilme!' : 
                                 reason === 'disconnect' ? 'Bağlantı Koptu!' : 'Mat!';
    
    this.overlayDesc.innerHTML = `<strong>${winner}</strong> oyunu kazandı. <br>Kaybeden: ${loser}`;
    
    this.boardOverlay.classList.add('active');

    // Show lobby returns if host
    const myPlayer = this.activeRoom?.players.find(p => p.id === this.socket.id);
    if (myPlayer && myPlayer.isHost) {
      this.btnGameLobby.style.display = 'block';
    }

    SynthSound.play('check');
  }

  // Append new chat message in boxes
  appendChatMessage(chatBox, data) {
    const div = document.createElement('div');
    div.className = 'msg-node';
    
    const timeStr = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (data.sender === 'System') {
      div.innerHTML = `<span class="system-text">[${timeStr}] ${data.message}</span>`;
    } else {
      const colorClass = data.color === 'white' ? 'white' : 'black';
      div.innerHTML = `
        <span style="color:var(--text-muted)">[${timeStr}]</span>
        <span class="sender ${colorClass}">${data.sender}:</span>
        <span>${data.message}</span>
      `;
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Global hook
window.ChessUI = ChessUI;
window.SynthSound = SynthSound;
