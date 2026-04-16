/**
 * Cobra Chess - Unified Frontend
 * Chess.com-style SPA with real-time evaluation and bot integration
 */

const API_URL = 'http://localhost:5000/api';

// ==================== UI CONSTANTS ====================

const PIECE_SYMBOLS = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const SQUARE_COLORS = {
    light: '#f0d9b5',
    dark: '#baca44'
};

const DIFFICULTY_TIME = {
    1: 100,   // Blitz
    2: 250,
    3: 500,
    4: 1000,
    5: 2000,
    6: 3000,
    7: 4000,
    8: 5000,
    9: 7500,
    10: 10000  // Rapid
};

// ==================== SOUND ENGINE ====================

class SoundEngine {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
    }

    init() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not available');
                this.enabled = false;
            }
        }
    }

    playMove() {
        if (!this.enabled) return;
        this.init();
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    playCapture() {
        if (!this.enabled) return;
        this.init();
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = 330;
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    playCheck() {
        if (!this.enabled) return;
        this.init();
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.2);
    }
}

// ==================== CHESS GAME ENGINE ====================

class ChessGame {
    constructor() {
        this.game = new Chess(); // chess.js library instance
        this.selectedSquare = null;
        this.moveHistory = [];
        this.evaluation = 0;
        this.lastMove = null;
        this.gameOver = false;
        this.gameOverReason = null;
        this.startTime = Date.now();
    }

    reset() {
        this.game.reset();
        this.selectedSquare = null;
        this.moveHistory = [];
        this.evaluation = 0;
        this.lastMove = null;
        this.gameOver = false;
        this.gameOverReason = null;
        this.startTime = Date.now();
    }

    getFEN() {
        return this.game.fen();
    }

    loadFEN(fen) {
        this.game.load(fen);
    }

    getLegalMoves(square = null) {
        if (square) {
            return this.game.moves({ square: square, verbose: true });
        }
        return this.game.moves({ verbose: true });
    }

    makeMove(from, to, promotion = null) {
        try {
            const move = {
                from: from,
                to: to,
                promotion: promotion || 'q'
            };
            const result = this.game.move(move);
            if (result) {
                this.lastMove = { from, to };
                this.moveHistory.push(result);
                this.checkGameEnd();
                return result;
            }
            return null;
        } catch (e) {
            console.error('Invalid move:', e);
            return null;
        }
    }

    undoMove() {
        if (this.moveHistory.length === 0) return null;
        const move = this.game.undo();
        if (move) {
            this.moveHistory.pop();
            this.lastMove = null;
            this.gameOver = false;
            this.gameOverReason = null;
        }
        return move;
    }

    checkGameEnd() {
        if (this.game.in_checkmate()) {
            this.gameOver = true;
            this.gameOverReason = this.game.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
        } else if (this.game.in_stalemate()) {
            this.gameOver = true;
            this.gameOverReason = 'Stalemate';
        } else if (this.game.insufficient_material()) {
            this.gameOver = true;
            this.gameOverReason = 'Draw by insufficient material';
        } else if (this.game.in_check()) {
            this.gameOverReason = `${this.game.turn() === 'w' ? 'White' : 'Black'} is in check`;
        }
    }

    getCurrentTurn() {
        return this.game.turn() === 'w' ? 'white' : 'black';
    }

    getBoard() {
        return this.game.board();
    }

    getElapsedTime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

// ==================== API CLIENT ====================

class CobraAPI {
    constructor(baseUrl = API_URL) {
        this.baseUrl = baseUrl;
        this.backendReady = false;
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            this.backendReady = response.ok;
            return await response.json();
        } catch (e) {
            console.error('Backend health check failed:', e);
            this.backendReady = false;
            return { status: 'error', error: e.message };
        }
    }

    async getMove(fen, difficulty = 5, useStockfish = true) {
        try {
            const response = await fetch(`${this.baseUrl}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: fen,
                    difficulty: difficulty,
                    use_stockfish: useStockfish,
                    training_mode: false
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (e) {
            console.error('Error getting move:', e);
            return { error: e.message };
        }
    }

    async evaluatePosition(fen, useStockfish = true) {
        try {
            const response = await fetch(`${this.baseUrl}/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: fen,
                    use_stockfish: useStockfish
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (e) {
            console.error('Error evaluating position:', e);
            return { evaluation: 0, error: e.message };
        }
    }

    async analyzePosition(fen, depth = 15) {
        try {
            const response = await fetch(`${this.baseUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: fen,
                    depth: depth
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (e) {
            console.error('Error analyzing position:', e);
            return { error: e.message };
        }
    }

    async getBotInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/bot-info`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Error getting bot info:', e);
            return { bots: [], error: e.message };
        }
    }
}

// ==================== UI MANAGER ====================

class ChessUI {
    constructor() {
        this.game = new ChessGame();
        this.api = new CobraAPI();
        this.sounds = new SoundEngine();
        
        // Game state
        this.playerColor = 'white';
        this.botEnabled = true;
        this.difficulty = 5;
        this.useStockfish = true;
        this.aiThinking = false;
        this.selectedSquare = null;
        this.highlightedSquares = new Set();

        // Timer
        this.timerInterval = null;

        // Initialize
        this.init();
    }

    async init() {
        console.log('Initializing Cobra Chess UI...');
        
        // Check backend
        const health = await this.api.checkHealth();
        console.log('Backend health:', health);
        this.updateBackendStatus(health);

        // Setup UI elements
        this.setupDOM();
        this.attachEventListeners();
        this.render();

        // Get bot info
        const botInfo = await this.api.getBotInfo();
        console.log('Available bots:', botInfo);

        // Start timer
        this.startTimer();

        console.log('UI initialized');
    }

    setupDOM() {
        // This assumes the HTML structure from index.html is present
        this.boardEl = document.getElementById('chessboard');
        this.statusEl = document.getElementById('gameStatus');
        this.evalScoreEl = document.getElementById('evalScore');
        this.evalBarEl = document.querySelector('.eval-fill');
        this.turnNumberEl = document.getElementById('turnNumber');
        this.moveHistoryEl = document.getElementById('moveHistory');
        this.gameTimerEl = document.getElementById('gameTimer');
        this.backendStatusEl = document.getElementById('backendStatus');

        // Game controls
        this.newGameBtn = document.getElementById('newGameBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.hintBtn = document.getElementById('hintBtn');
        this.flipBoardBtn = document.getElementById('flipBoardBtn');

        // Settings
        this.engineTypeSelect = document.getElementById('engineType');
        this.difficultySelect = document.getElementById('difficulty');
        this.playerColorSelect = document.getElementById('playerColor');
        this.soundToggle = document.getElementById('soundToggle');
    }

    attachEventListeners() {
        // Board clicks
        if (this.boardEl) {
            this.boardEl.addEventListener('click', (e) => this.handleBoardClick(e));
        }

        // Button clicks
        if (this.newGameBtn) this.newGameBtn.addEventListener('click', () => this.newGame());
        if (this.undoBtn) this.undoBtn.addEventListener('click', () => this.undoLastMove());
        if (this.hintBtn) this.hintBtn.addEventListener('click', () => this.showHint());
        if (this.flipBoardBtn) this.flipBoardBtn.addEventListener('click', () => this.flipBoard());

        // Settings changes
        if (this.playerColorSelect) {
            this.playerColorSelect.addEventListener('change', (e) => {
                this.playerColor = e.target.value;
                this.flipBoard();
            });
        }

        if (this.difficultySelect) {
            this.difficultySelect.addEventListener('change', (e) => {
                this.difficulty = parseInt(e.target.value);
            });
        }

        if (this.engineTypeSelect) {
            this.engineTypeSelect.addEventListener('change', (e) => {
                this.useStockfish = e.target.value !== 'transformer';
            });
        }

        if (this.soundToggle) {
            this.soundToggle.addEventListener('change', (e) => {
                this.sounds.enabled = e.target.checked;
            });
        }
    }

    handleBoardClick(e) {
        if (this.aiThinking || this.game.gameOver) return;

        const rect = this.boardEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const squareSize = rect.width / 8;
        let col = Math.floor(x / squareSize);
        let row = Math.floor(y / squareSize);

        if (this.playerColor === 'black') {
            col = 7 - col;
            row = 7 - row;
        }

        const squareName = String.fromCharCode(97 + col) + (8 - row);
        this.selectSquare(squareName);
    }

    selectSquare(square) {
        if (!this.selectedSquare) {
            // First click - select piece
            const piece = this.game.game.get(square);
            if (!piece) return;
            if ((this.playerColor === 'white' && piece.color === 'b') ||
                (this.playerColor === 'black' && piece.color === 'w')) {
                return; // Can't select opponent's piece
            }
            this.selectedSquare = square;
            this.updateLegalMoves(square);
        } else {
            // Second click - make move
            if (square === this.selectedSquare) {
                this.selectedSquare = null;
                this.highlightedSquares.clear();
            } else {
                this.makePlayerMove(this.selectedSquare, square);
                this.selectedSquare = null;
                this.highlightedSquares.clear();
            }
        }
        this.render();
    }

    updateLegalMoves(square) {
        this.highlightedSquares.clear();
        const moves = this.game.getLegalMoves(square);
        moves.forEach(move => {
            this.highlightedSquares.add(move.to);
        });
    }

    async makePlayerMove(from, to) {
        // Check for pawn promotion
        const piece = this.game.game.get(from);
        let promotion = null;

        if (piece && piece.type === 'p') {
            const toRow = parseInt(to[1]);
            if ((piece.color === 'w' && toRow === 8) || (piece.color === 'b' && toRow === 1)) {
                promotion = await this.promptPromotion();
            }
        }

        const move = this.game.makeMove(from, to, promotion);
        if (!move) return;

        this.sounds.playMove();
        await this.updateEvaluation();
        this.render();

        // AI move
        if (this.botEnabled && this.game.getCurrentTurn() !== this.playerColor && !this.game.gameOver) {
            await this.makeAIMove();
        }
    }

    async makeAIMove() {
        if (this.aiThinking) return;
        this.aiThinking = true;
        this.render();

        try {
            const moveData = await this.api.getMove(
                this.game.getFEN(),
                this.difficulty,
                this.useStockfish
            );

            if (moveData.error) {
                console.error('AI move error:', moveData.error);
                this.aiThinking = false;
                this.render();
                return;
            }

            const from = moveData.move.substring(0, 2);
            const to = moveData.move.substring(2, 4);
            const promotion = moveData.move.length > 4 ? moveData.move[4] : null;

            this.game.makeMove(from, to, promotion);
            this.game.evaluation = moveData.evaluation;
            this.sounds.playMove();
            this.render();
        } catch (e) {
            console.error('Error making AI move:', e);
        } finally {
            this.aiThinking = false;
        }
    }

    async updateEvaluation() {
        const evalData = await this.api.evaluatePosition(
            this.game.getFEN(),
            this.useStockfish
        );

        if (!evalData.error) {
            this.game.evaluation = evalData.evaluation;
        }
    }

    async showHint() {
        const evalData = await this.api.evaluatePosition(
            this.game.getFEN(),
            this.useStockfish
        );

        if (!evalData.error) {
            alert(`Evaluation: ${evalData.evaluation > 0 ? '+' : ''}${evalData.evaluation}`);
        }
    }

    undoLastMove() {
        if (this.game.moveHistory.length === 0) return;
        this.game.undoMove();
        if (this.game.moveHistory.length > 0) {
            this.game.undoMove();
        }
        this.render();
    }

    newGame() {
        this.game.reset();
        this.selectedSquare = null;
        this.highlightedSquares.clear();
        this.render();
    }

    flipBoard() {
        this.render();
    }

    async promptPromotion() {
        return prompt('Promotion piece (q/r/b/n):', 'q') || 'q';
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.gameTimerEl) {
                this.gameTimerEl.textContent = this.game.formatTime(this.game.getElapsedTime());
            }
        }, 1000);
    }

    updateBackendStatus(health) {
        if (this.backendStatusEl) {
            if (health.status === 'ok') {
                this.backendStatusEl.textContent = '✓ Online';
                this.backendStatusEl.className = 'info-value status-ok';
            } else {
                this.backendStatusEl.textContent = '✗ Offline';
                this.backendStatusEl.className = 'info-value status-error';
            }
        }
    }

    updateEvalBar() {
        if (!this.evalBarEl || !this.evalScoreEl) return;

        const eval = Math.max(-10, Math.min(10, this.game.evaluation));
        const percentage = ((eval + 10) / 20) * 100;

        this.evalBarEl.style.width = percentage + '%';
        this.evalScoreEl.textContent = eval.toFixed(1);
    }

    render() {
        this.renderBoard();
        this.renderStatus();
        this.renderMoveHistory();
        this.updateEvalBar();
    }

    renderBoard() {
        if (!this.boardEl) return;

        this.boardEl.innerHTML = '';
        const board = this.game.getBoard();

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let displayCol = col;
                let displayRow = row;

                if (this.playerColor === 'black') {
                    displayCol = 7 - col;
                    displayRow = 7 - row;
                }

                const square = String.fromCharCode(97 + displayCol) + (8 - displayRow);
                const piece = board[row][col];
                const squareEl = document.createElement('div');

                squareEl.className = 'square';
                squareEl.style.width = '12.5%';
                squareEl.style.aspectRatio = '1';
                squareEl.style.backgroundColor = 
                    ((row + col) % 2 === 0) ? SQUARE_COLORS.light : SQUARE_COLORS.dark;

                // Highlighting
                if (this.selectedSquare === square) {
                    squareEl.style.backgroundColor = '#7fc97f';
                } else if (this.highlightedSquares.has(square)) {
                    squareEl.style.backgroundColor = '#baca44';
                } else if (this.game.lastMove && 
                           (square === this.game.lastMove.from || square === this.game.lastMove.to)) {
                    squareEl.style.backgroundColor = '#cdd16c';
                }

                if (piece) {
                    const pieceEl = document.createElement('span');
                    pieceEl.textContent = PIECE_SYMBOLS[piece.type.toUpperCase()];
                    pieceEl.style.fontSize = '3em';
                    pieceEl.style.color = piece.color === 'w' ? '#fff' : '#000';
                    pieceEl.style.cursor = 'pointer';
                    squareEl.appendChild(pieceEl);
                }

                this.boardEl.appendChild(squareEl);
            }
        }
    }

    renderStatus() {
        if (!this.statusEl || !this.turnNumberEl) return;

        let statusText = '';
        if (this.game.gameOver) {
            statusText = this.game.gameOverReason || 'Game Over';
        } else if (this.aiThinking) {
            statusText = 'AI thinking...';
        } else {
            const turn = this.game.getCurrentTurn();
            statusText = `${turn.charAt(0).toUpperCase() + turn.slice(1)} to move`;
        }

        this.statusEl.textContent = statusText;
        this.turnNumberEl.textContent = Math.ceil(this.game.moveHistory.length / 2);
    }

    renderMoveHistory() {
        if (!this.moveHistoryEl) return;

        this.moveHistoryEl.innerHTML = '';
        let moveNum = 1;

        for (let i = 0; i < this.game.moveHistory.length; i += 2) {
            const moveRow = document.createElement('div');
            moveRow.className = 'move-row';
            moveRow.style.display = 'flex';
            moveRow.style.gap = '10px';
            moveRow.style.marginBottom = '8px';

            const moveNumEl = document.createElement('span');
            moveNumEl.textContent = moveNum + '.';
            moveNumEl.style.minWidth = '30px';
            moveNumEl.style.color = '#666';
            moveRow.appendChild(moveNumEl);

            if (i < this.game.moveHistory.length) {
                const moveEl1 = document.createElement('span');
                moveEl1.textContent = this.game.moveHistory[i].san;
                moveEl1.style.flex = '1';
                moveRow.appendChild(moveEl1);
            }

            if (i + 1 < this.game.moveHistory.length) {
                const moveEl2 = document.createElement('span');
                moveEl2.textContent = this.game.moveHistory[i + 1].san;
                moveEl2.style.flex = '1';
                moveRow.appendChild(moveEl2);
            }

            this.moveHistoryEl.appendChild(moveRow);
            moveNum++;
        }
    }
}

// ==================== APPLICATION BOOTSTRAP ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Chess UI...');
    new ChessUI();
});
