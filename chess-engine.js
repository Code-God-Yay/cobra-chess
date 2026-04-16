// Cobra Chess Engine v2.0 - Enhanced with Features

const API_URL = 'http://localhost:5000/api';

const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Sound Effects (Web Audio API)
class SoundEngine {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

class ChessGame {
    constructor() {
        this.board = this.initBoard();
        this.turn = 'white';
        this.selected = null;
        this.gameOver = false;
        this.moves = [];
        this.captured = { white: [], black: [] };
        this.enPassant = null;
        this.castling = { whiteK: true, whiteQ: true, blackK: true, blackQ: true };
        this.kingMoved = { white: false, black: false };
        this.rookMoved = { white: [false, false], black: [false, false] };
        this.playerColor = 'white';
        this.difficulty = 3;
        this.engineType = 'hybrid';
        this.turnNum = 1;
        this.eval = 0;
        this.backendOK = false;
        this.flipped = false;
        this.hintMove = null;
        this.startTime = Date.now();
    }

    initBoard() {
        return [
            ['r','n','b','q','k','b','n','r'],
            ['p','p','p','p','p','p','p','p'],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['P','P','P','P','P','P','P','P'],
            ['R','N','B','Q','K','B','N','R']
        ];
    }

    isWhite(p) { return p === p.toUpperCase(); }
    getColor(p) { return this.isWhite(p) ? 'white' : 'black'; }
    valid(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    getMoves(r, c) {
        const p = this.board[r][c];
        if (!p) return [];
        
        const moves = [];
        const white = this.isWhite(p);
        const type = p.toLowerCase();

        if (type === 'p') {
            const dir = white ? -1 : 1;
            const start = white ? 6 : 1;
            
            if (this.board[r + dir]?.[c] === '') {
                moves.push({ r: r + dir, c });
                if (r === start && this.board[r + 2 * dir]?.[c] === '') {
                    moves.push({ r: r + 2 * dir, c });
                }
            }
            
            [-1, 1].forEach(off => {
                const tr = r + dir;
                const tc = c + off;
                const tp = this.board[tr]?.[tc];
                if (tp && this.isWhite(tp) !== white) {
                    moves.push({ r: tr, c: tc });
                }
                if (this.enPassant && this.enPassant.r === tr && this.enPassant.c === tc) {
                    moves.push({ r: tr, c: tc, ep: true });
                }
            });
        } else if (type === 'n') {
            [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => {
                const nr = r + dr, nc = c + dc;
                if (this.valid(nr, nc)) {
                    const tp = this.board[nr][nc];
                    if (!tp || this.isWhite(tp) !== white) {
                        moves.push({ r: nr, c: nc });
                    }
                }
            });
        } else if (type === 'b') {
            this.addLines(r, c, [[1,1],[1,-1],[-1,1],[-1,-1]], moves, white);
        } else if (type === 'r') {
            this.addLines(r, c, [[1,0],[-1,0],[0,1],[0,-1]], moves, white);
        } else if (type === 'q') {
            this.addLines(r, c, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], moves, white);
        } else if (type === 'k') {
            [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => {
                const nr = r + dr, nc = c + dc;
                if (this.valid(nr, nc)) {
                    const tp = this.board[nr][nc];
                    if (!tp || this.isWhite(tp) !== white) {
                        moves.push({ r: nr, c: nc });
                    }
                }
            });
            this.addCastle(r, c, moves, white);
        }

        return moves.filter(m => !this.wouldCheck(r, c, m.r, m.c, white));
    }

    addLines(r, c, dirs, moves, white) {
        dirs.forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            while (this.valid(nr, nc)) {
                const tp = this.board[nr][nc];
                if (!tp) {
                    moves.push({ r: nr, c: nc });
                } else {
                    if (this.isWhite(tp) !== white) {
                        moves.push({ r: nr, c: nc });
                    }
                    break;
                }
                nr += dr; nc += dc;
            }
        });
    }

    addCastle(r, c, moves, white) {
        const color = white ? 'white' : 'black';
        if (this.kingMoved[color] || this.isCheck(color)) return;
        
        const row = white ? 7 : 0;
        
        if (!this.rookMoved[color][1] && this.board[row][5] === '' && this.board[row][6] === '' &&
            !this.squareAttack(row, 5, color) && !this.squareAttack(row, 6, color)) {
            moves.push({ r: row, c: 6, castle: 'k' });
        }
        
        if (!this.rookMoved[color][0] && this.board[row][1] === '' && this.board[row][2] === '' && 
            this.board[row][3] === '' && !this.squareAttack(row, 2, color) && !this.squareAttack(row, 3, color)) {
            moves.push({ r: row, c: 2, castle: 'q' });
        }
    }

    wouldCheck(fr, fc, tr, tc, white) {
        const orig = this.board[tr][tc];
        const piece = this.board[fr][fc];
        this.board[tr][tc] = piece;
        this.board[fr][fc] = '';
        
        const check = this.isCheck(white ? 'white' : 'black');
        
        this.board[fr][fc] = piece;
        this.board[tr][tc] = orig;
        
        return check;
    }

    isCheck(color) {
        let kr, kc;
        const king = color === 'white' ? 'K' : 'k';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] === king) {
                    kr = r; kc = c;
                    break;
                }
            }
        }
        
        return this.squareAttack(kr, kc, color);
    }

    squareAttack(r, c, defColor) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = this.board[row][col];
                if (p && this.getColor(p) !== defColor) {
                    const pseudo = this.getPseudo(row, col);
                    if (pseudo.some(m => m.r === r && m.c === c)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getPseudo(r, c) {
        const p = this.board[r][c];
        if (!p) return [];
        
        const moves = [];
        const white = this.isWhite(p);
        const type = p.toLowerCase();

        if (type === 'p') {
            const dir = white ? -1 : 1;
            [-1, 1].forEach(off => {
                const tr = r + dir, tc = c + off;
                if (this.valid(tr, tc)) moves.push({ r: tr, c: tc });
            });
        } else if (type === 'n') {
            [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => {
                const nr = r + dr, nc = c + dc;
                if (this.valid(nr, nc)) moves.push({ r: nr, c: nc });
            });
        } else if (type === 'b') {
            this.addLines(r, c, [[1,1],[1,-1],[-1,1],[-1,-1]], moves, white);
        } else if (type === 'r') {
            this.addLines(r, c, [[1,0],[-1,0],[0,1],[0,-1]], moves, white);
        } else if (type === 'q') {
            this.addLines(r, c, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], moves, white);
        } else if (type === 'k') {
            [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => {
                const nr = r + dr, nc = c + dc;
                if (this.valid(nr, nc)) moves.push({ r: nr, c: nc });
            });
        }
        
        return moves;
    }

    makeMove(fr, fc, tr, tc) {
        const p = this.board[fr][fc];
        const cap = this.board[tr][tc];
        const move = this.getMoves(fr, fc).find(m => m.r === tr && m.c === tc);
        
        if (!move) return false;
        
        const rec = { from: {r:fr,c:fc}, to: {r:tr,c:tc}, piece: p, cap, ep: move.ep, castle: move.castle, promo: null };
        
        if (move.ep) {
            const capR = this.turn === 'white' ? tr + 1 : tr - 1;
            const pawn = this.board[capR][tc];
            this.board[capR][tc] = '';
            rec.cap = pawn;
            this.captured[this.turn].push(pawn);
        } else if (cap) {
            this.captured[this.turn].push(cap);
        }
        
        if (move.castle) {
            const row = this.turn === 'white' ? 7 : 0;
            if (move.castle === 'k') {
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = '';
            } else {
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = '';
            }
        }
        
        this.board[tr][tc] = p;
        this.board[fr][fc] = '';
        
        if (p.toLowerCase() === 'p' && (tr === 0 || tr === 7)) {
            const promo = this.turn === 'white' ? 'Q' : 'q';
            this.board[tr][tc] = promo;
            rec.promo = 'Q';
        }
        
        this.enPassant = null;
        if (p.toLowerCase() === 'p' && Math.abs(tr - fr) === 2) {
            this.enPassant = { r: (fr + tr) / 2, c: tc };
        }
        
        if (p.toLowerCase() === 'k') {
            this.kingMoved[this.turn] = true;
        }
        if (p.toLowerCase() === 'r') {
            if (fc === 0) this.rookMoved[this.turn][0] = true;
            if (fc === 7) this.rookMoved[this.turn][1] = true;
        }
        
        this.moves.push(rec);
        this.turn = this.turn === 'white' ? 'black' : 'white';
        
        if (this.turn === 'white') this.turnNum++;
        
        this.checkEnd();
        return true;
    }

    checkEnd() {
        if (!this.hasLegal(this.turn)) {
            if (this.isCheck(this.turn)) {
                this.gameOver = true;
                return this.turn === 'white' ? 'black' : 'white';
            } else {
                this.gameOver = true;
                return 'draw';
            }
        }
        return null;
    }

    hasLegal(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p && this.getColor(p) === color) {
                    if (this.getMoves(r, c).length > 0) return true;
                }
            }
        }
        return false;
    }

    undo() {
        if (this.moves.length < 2) return false;
        this.undoOne();
        this.undoOne();
        return true;
    }

    undoOne() {
        if (this.moves.length === 0) return;
        
        const m = this.moves.pop();
        this.board[m.from.r][m.from.c] = m.piece;
        this.board[m.to.r][m.to.c] = m.cap || '';
        
        if (m.ep) {
            const capR = this.turn === 'black' ? m.to.r + 1 : m.to.r - 1;
            this.board[capR][m.to.c] = m.cap;
            this.captured[this.turn === 'white' ? 'black' : 'white'].pop();
        } else if (m.cap) {
            this.captured[this.turn === 'white' ? 'black' : 'white'].pop();
        }
        
        if (m.castle) {
            const row = m.from.r;
            if (m.castle === 'k') {
                this.board[row][7] = this.board[row][5];
                this.board[row][5] = '';
            } else {
                this.board[row][0] = this.board[row][3];
                this.board[row][3] = '';
            }
        }
        
        this.turn = this.turn === 'white' ? 'black' : 'white';
        if (this.turn === 'black') this.turnNum--;
        this.gameOver = false;
    }

    getFEN() {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p === '') {
                    empty++;
                } else {
                    if (empty > 0) { fen += empty; empty = 0; }
                    fen += p;
                }
            }
            if (empty > 0) fen += empty;
            if (r < 7) fen += '/';
        }
        fen += this.turn === 'white' ? ' w ' : ' b ';
        let castle = '';
        if (this.castling.whiteK) castle += 'K';
        if (this.castling.whiteQ) castle += 'Q';
        if (this.castling.blackK) castle += 'k';
        if (this.castling.blackQ) castle += 'q';
        fen += castle || '-';
        fen += ' - 0 1';
        return fen;
    }

    getNotation(m) {
        const p = m.piece.toUpperCase();
        const ff = String.fromCharCode(97 + m.from.c);
        const fr = 8 - m.from.r;
        const tf = String.fromCharCode(97 + m.to.c);
        const tr = 8 - m.to.r;
        
        let n = '';
        if (p !== 'P') n += p;
        n += ff + fr;
        n += m.cap ? 'x' : '-';
        n += tf + tr;
        if (m.promo) n += '=' + m.promo;
        return n;
    }

    getElapsedTime() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

class ChessUI {
    constructor() {
        this.game = new ChessGame();
        this.sound = new SoundEngine();
        this.board = document.getElementById('chessboard');
        this.status = document.getElementById('gameStatus');
        this.moveList = document.getElementById('moveHistory');
        this.drawSvg = document.getElementById('drawingLayer');
        this.drawings = [];
        this.drawing = false;
        this.drawStart = null;
        this.animationsEnabled = true;
        this.highlightsEnabled = true;
        this.timerInterval = null;
        
        this.init();
        this.attach();
        this.update();
        this.checkBackend();
        this.startTimer();
        
        if (this.game.playerColor === 'black') this.aiMove();
    }

    async checkBackend() {
        try {
            const res = await fetch('http://localhost:5000/health');
            const data = await res.json();
            this.game.backendOK = data.status === 'ok';
            this.updateBackend(true);
        } catch {
            this.game.backendOK = false;
            this.updateBackend(false);
        }
    }

    updateBackend(ok) {
        const el = document.getElementById('backendStatus');
        if (ok) {
            el.textContent = 'Connected';
            el.className = 'info-value status-connected';
        } else {
            el.textContent = 'Offline';
            el.className = 'info-value status-error';
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            document.getElementById('gameTimer').textContent = this.game.getElapsedTime();
        }, 1000);
    }

    init() {
        this.board.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const displayR = this.game.flipped ? 7 - r : r;
                const displayC = this.game.flipped ? 7 - c : c;
                
                const sq = document.createElement('div');
                sq.className = `square ${(displayR + displayC) % 2 === 0 ? 'light' : 'dark'}`;
                sq.dataset.row = r;
                sq.dataset.col = c;
                sq.dataset.file = String.fromCharCode(97 + c);
                sq.dataset.rank = 8 - r;
                
                const p = this.game.board[r][c];
                if (p) {
                    const span = document.createElement('span');
                    span.className = 'piece';
                    span.textContent = PIECES[p];
                    sq.appendChild(span);
                }
                
                sq.addEventListener('click', () => this.click(r, c));
                sq.addEventListener('contextmenu', e => this.rightClick(e, r, c));
                this.board.appendChild(sq);
            }
        }
    }

    attach() {
        document.getElementById('newGameBtn').onclick = () => this.newGame();
        document.getElementById('undoBtn').onclick = () => this.undo();
        document.getElementById('hintBtn').onclick = () => this.showHint();
        document.getElementById('clearDrawBtn').onclick = () => this.clearDraw();
        document.getElementById('flipBoardBtn').onclick = () => this.flipBoard();
        
        document.getElementById('difficulty').onchange = e => this.game.difficulty = +e.target.value;
        document.getElementById('engineType').onchange = e => this.game.engineType = e.target.value;
        document.getElementById('playerColor').onchange = e => {
            this.game.playerColor = e.target.value;
            this.newGame();
        };
        
        document.getElementById('soundToggle').onchange = e => this.sound.enabled = e.target.checked;
        document.getElementById('highlightToggle').onchange = e => this.highlightsEnabled = e.target.checked;
        document.getElementById('animationToggle').onchange = e => this.animationsEnabled = e.target.checked;
        
        this.drawSvg.addEventListener('mousedown', e => this.startDraw(e));
        this.drawSvg.addEventListener('mousemove', e => this.moveDraw(e));
        this.drawSvg.addEventListener('mouseup', () => this.endDraw());
        this.drawSvg.addEventListener('mouseleave', () => this.endDraw());
    }

    click(r, c) {
        if (this.game.gameOver || this.game.turn !== this.game.playerColor) return;
        
        this.game.hintMove = null;
        const p = this.game.board[r][c];
        
        if (this.game.selected) {
            const [sr, sc] = this.game.selected;
            const moves = this.game.getMoves(sr, sc);
            
            if (moves.some(m => m.r === r && m.c === c)) {
                const cap = this.game.board[r][c];
                if (this.game.makeMove(sr, sc, r, c)) {
                    this.game.selected = null;
                    
                    if (cap) {
                        this.sound.playCapture();
                    } else {
                        this.sound.playMove();
                    }
                    
                    if (this.game.isCheck(this.game.turn)) {
                        this.sound.playCheck();
                    }
                    
                    this.update();
                    this.clearDraw();
                    this.updateEval();
                    
                    if (!this.game.gameOver && this.game.turn !== this.game.playerColor) {
                        setTimeout(() => this.aiMove(), 500);
                    }
                }
            } else if (p && this.game.getColor(p) === this.game.turn) {
                this.game.selected = [r, c];
                this.update();
            } else {
                this.game.selected = null;
                this.update();
            }
        } else if (p && this.game.getColor(p) === this.game.turn) {
            this.game.selected = [r, c];
            this.update();
        }
    }

    rightClick(e, r, c) {
        e.preventDefault();
    }

    flipBoard() {
        this.game.flipped = !this.game.flipped;
        this.init();
        this.update();
    }

    async showHint() {
        if (!this.game.backendOK || this.game.gameOver || this.game.turn !== this.game.playerColor) return;
        
        try {
            const res = await fetch(`${API_URL}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: this.game.getFEN(),
                    engine: this.game.engineType,
                    difficulty: this.game.difficulty
                })
            });
            
            const data = await res.json();
            
            if (data.move) {
                const from = { r: 8 - parseInt(data.move[1]), c: data.move.charCodeAt(0) - 97 };
                const to = { r: 8 - parseInt(data.move[3]), c: data.move.charCodeAt(2) - 97 };
                
                this.game.hintMove = { from, to };
                this.update();
                
                setTimeout(() => {
                    this.game.hintMove = null;
                    this.update();
                }, 3000);
            }
        } catch (err) {
            console.error('Hint failed:', err);
        }
    }

    startDraw(e) {
        if (e.button !== 2) return;
        e.preventDefault();
        const rect = this.drawSvg.getBoundingClientRect();
        this.drawing = true;
        this.drawStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, ctrl: e.ctrlKey };
    }

    moveDraw(e) {
        if (!this.drawing) return;
        const rect = this.drawSvg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const temp = this.drawSvg.querySelector('.temp');
        if (temp) temp.remove();
        
        if (this.drawStart.ctrl) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'draw-arrow temp');
            line.setAttribute('x1', this.drawStart.x);
            line.setAttribute('y1', this.drawStart.y);
            line.setAttribute('x2', x);
            line.setAttribute('y2', y);
            line.setAttribute('marker-end', 'url(#arrowhead)');
            this.drawSvg.appendChild(line);
        } else {
            const dx = x - this.drawStart.x;
            const dy = y - this.drawStart.y;
            const r = Math.sqrt(dx*dx + dy*dy);
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'draw-circle temp');
            circle.setAttribute('cx', this.drawStart.x);
            circle.setAttribute('cy', this.drawStart.y);
            circle.setAttribute('r', r);
            this.drawSvg.appendChild(circle);
        }
    }

    endDraw() {
        if (!this.drawing) return;
        const temp = this.drawSvg.querySelector('.temp');
        if (temp) {
            temp.classList.remove('temp');
            this.drawings.push(temp);
        }
        this.drawing = false;
        this.drawStart = null;
    }

    clearDraw() {
        this.drawings.forEach(d => d.remove());
        this.drawings = [];
        const temp = this.drawSvg.querySelector('.temp');
        if (temp) temp.remove();
    }

    async aiMove() {
        if (!this.game.backendOK) {
            console.error('Backend offline');
            return;
        }
        
        this.status.textContent = '🐍 Cobra thinking...';
        this.status.classList.add('thinking');
        
        try {
            const res = await fetch(`${API_URL}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: this.game.getFEN(),
                    engine: this.game.engineType,
                    difficulty: this.game.difficulty
                })
            });
            
            const data = await res.json();
            
            if (data.move) {
                const from = { r: 8 - parseInt(data.move[1]), c: data.move.charCodeAt(0) - 97 };
                const to = { r: 8 - parseInt(data.move[3]), c: data.move.charCodeAt(2) - 97 };
                
                const cap = this.game.board[to.r][to.c];
                this.game.makeMove(from.r, from.c, to.r, to.c);
                
                if (cap) {
                    this.sound.playCapture();
                } else {
                    this.sound.playMove();
                }
                
                if (this.game.isCheck(this.game.turn)) {
                    this.sound.playCheck();
                }
                
                this.update();
                this.updateEval();
            }
        } catch (err) {
            console.error('AI move failed:', err);
        }
        
        this.status.classList.remove('thinking');
    }

    async updateEval() {
        if (!this.game.backendOK) return;
        
        try {
            const res = await fetch(`${API_URL}/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: this.game.getFEN() })
            });
            
            const data = await res.json();
            this.game.eval = data.evaluation;
            this.renderEval(data.evaluation);
        } catch (err) {
            console.error('Eval failed:', err);
        }
    }

    renderEval(ev) {
        const fill = document.getElementById('evalFill');
        const val = document.getElementById('evalScore');
        
        const norm = Math.max(-10, Math.min(10, ev));
        const pct = ((norm + 10) / 20) * 100;
        
        fill.style.width = `${pct}%`;
        val.textContent = ev > 0 ? `+${ev.toFixed(1)}` : ev.toFixed(1);
    }

    update() {
        this.renderBoard();
        this.renderStatus();
        this.renderMoves();
        this.renderCaptured();
        this.renderTurn();
    }

    renderBoard() {
        const squares = this.board.querySelectorAll('.square');
        squares.forEach(sq => {
            const r = +sq.dataset.row;
            const c = +sq.dataset.col;
            const p = this.game.board[r][c];
            
            sq.innerHTML = '';
            const displayR = this.game.flipped ? 7 - r : r;
            const displayC = this.game.flipped ? 7 - c : c;
            sq.className = `square ${(displayR + displayC) % 2 === 0 ? 'light' : 'dark'}`;
            sq.dataset.file = String.fromCharCode(97 + c);
            sq.dataset.rank = 8 - r;
            
            if (p) {
                const span = document.createElement('span');
                span.className = 'piece';
                span.textContent = PIECES[p];
                sq.appendChild(span);
            }
            
            if (this.game.selected && this.highlightsEnabled) {
                const [sr, sc] = this.game.selected;
                if (r === sr && c === sc) sq.classList.add('selected');
                
                const moves = this.game.getMoves(sr, sc);
                if (moves.some(m => m.r === r && m.c === c)) {
                    sq.classList.add('valid-move');
                    if (p) sq.classList.add('has-piece');
                }
            }
            
            if (this.game.hintMove && this.highlightsEnabled) {
                if ((r === this.game.hintMove.from.r && c === this.game.hintMove.from.c) ||
                    (r === this.game.hintMove.to.r && c === this.game.hintMove.to.c)) {
                    sq.classList.add('hint-move');
                }
            }
            
            if (this.game.moves.length > 0 && this.highlightsEnabled) {
                const last = this.game.moves[this.game.moves.length - 1];
                if ((r === last.from.r && c === last.from.c) || (r === last.to.r && c === last.to.c)) {
                    sq.classList.add('last-move');
                }
            }
            
            if (this.game.isCheck(this.game.turn)) {
                const king = this.game.turn === 'white' ? 'K' : 'k';
                if (p === king) sq.classList.add('in-check');
            }
        });
    }

    renderStatus() {
        const res = this.game.checkEnd();
        if (res) {
            if (res === 'draw') {
                this.status.textContent = 'Game Over - Draw';
            } else {
                this.status.textContent = `Checkmate! ${res === 'white' ? 'White' : 'Black'} wins!`;
            }
        } else {
            const p = this.game.turn === 'white' ? 'White' : 'Black';
            const check = this.game.isCheck(this.game.turn) ? ' - Check!' : '';
            this.status.textContent = `${p} to move${check}`;
        }
    }

    renderMoves() {
        this.moveList.innerHTML = '';
        for (let i = 0; i < this.game.moves.length; i += 2) {
            const w = this.game.moves[i];
            const b = this.game.moves[i + 1];
            
            const entry = document.createElement('div');
            entry.className = 'move-entry';
            
            const num = document.createElement('span');
            num.className = 'move-num';
            num.textContent = `${Math.floor(i / 2) + 1}.`;
            
            const wm = document.createElement('span');
            wm.className = 'move-text';
            wm.textContent = this.game.getNotation(w);
            
            entry.appendChild(num);
            entry.appendChild(wm);
            
            if (b) {
                const bm = document.createElement('span');
                bm.className = 'move-text';
                bm.textContent = this.game.getNotation(b);
                entry.appendChild(bm);
            }
            
            this.moveList.appendChild(entry);
        }
        this.moveList.scrollTop = this.moveList.scrollHeight;
    }

    renderCaptured() {
        const wDiv = document.getElementById('capturedByBlack');
        const bDiv = document.getElementById('capturedByWhite');
        wDiv.textContent = this.game.captured.white.map(p => PIECES[p]).join(' ');
        bDiv.textContent = this.game.captured.black.map(p => PIECES[p]).join(' ');
    }

    renderTurn() {
        document.getElementById('turnNumber').textContent = this.game.turnNum;
    }

    undo() {
        if (this.game.undo()) {
            this.sound.playMove();
            this.update();
            this.clearDraw();
            this.updateEval();
        }
    }

    newGame() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.game = new ChessGame();
        this.game.difficulty = +document.getElementById('difficulty').value;
        this.game.playerColor = document.getElementById('playerColor').value;
        this.game.engineType = document.getElementById('engineType').value;
        this.init();
        this.update();
        this.clearDraw();
        this.startTimer();
        
        if (this.game.playerColor === 'black') {
            setTimeout(() => this.aiMove(), 500);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChessUI();
});
