"""
Cobra Chess - Unified AI Backend
A high-performance chess engine combining Transformer models with Stockfish NNUE.
"""

import chess
import chess.engine
import torch
import torch.nn as nn
import os
import atexit
import math
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path

# ==================== TRANSFORMER ARCHITECTURE ====================

class PositionalEncoding(nn.Module):
    """Positional encoding for transformer inputs."""
    def __init__(self, d_model, max_len=64):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe.unsqueeze(0))

    def forward(self, x):
        return x + self.pe[:, :x.size(1)]


class CobraTransformer(nn.Module):
    """
    Transformer-based chess evaluation network.
    Uses board state embeddings, positional encoding, and multi-head attention.
    """
    def __init__(self, embed_dim=256, nhead=8, num_layers=6):
        super().__init__()
        self.embedding = nn.Embedding(13, embed_dim)  # 13: empty + 6*2 pieces
        self.pos_encoder = PositionalEncoding(embed_dim)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, 
            nhead=nhead, 
            batch_first=True,
            dim_feedforward=1024,
            dropout=0.1
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Sequential(
            nn.Linear(embed_dim * 64, 512),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Tanh()
        )

    def forward(self, x):
        """
        Args:
            x: [batch_size, 64] - board state indices
        Returns:
            evaluation: [batch_size, 1] - position evaluation [-1, 1]
        """
        x = self.pos_encoder(self.embedding(x))
        x = self.transformer(x)
        x = x.reshape(x.size(0), -1)
        return self.fc(x)


# ==================== UTILITY FUNCTIONS ====================

def board_to_indices(board):
    """
    Convert chess board to tensor indices.
    0: empty, 1-6: white pieces (P,N,B,R,Q,K), 7-12: black pieces
    """
    piece_map = {
        'P': 1, 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6,
        'p': 7, 'n': 8, 'b': 9, 'r': 10, 'q': 11, 'k': 12
    }
    indices = torch.zeros(64, dtype=torch.long)
    for square in range(64):
        piece = board.piece_at(square)
        if piece:
            indices[square] = piece_map[piece.symbol()]
    return indices.unsqueeze(0)


# ==================== ENGINE CLASSES ====================

class CobraAI:
    """
    Transformer-based chess AI with Stockfish fallback.
    Supports both inference and training modes.
    """
    
    def __init__(self, transformer_weights_path="models/transformer_cobra.pt",
                 stockfish_path="/opt/homebrew/bin/stockfish"):
        self.device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
        
        # Initialize transformer
        self.model = CobraTransformer().to(self.device)
        self.model.eval()
        
        # Load pre-trained weights if available
        if os.path.exists(transformer_weights_path):
            try:
                self.model.load_state_dict(
                    torch.load(transformer_weights_path, map_location=self.device)
                )
                print(f"✓ Loaded Transformer weights from {transformer_weights_path}")
            except Exception as e:
                print(f"⚠ Warning: Could not load transformer weights: {e}")
        else:
            print(f"⚠ Transformer weights not found at {transformer_weights_path}")
        
        # Initialize Stockfish
        self.stockfish_path = stockfish_path
        self.engine = None
        self._init_stockfish()
    
    def _init_stockfish(self):
        """Initialize Stockfish engine with modern UCI parameters."""
        try:
            self.engine = chess.engine.SimpleEngine.popen_uci(self.stockfish_path)
            # Modern Stockfish (16+) parameters
            self.engine.configure({
                "Threads": 4,
                "Hash": 256,
                "MultiPV": 1
            })
            print(f"✓ Stockfish initialized from {self.stockfish_path}")
            return True
        except Exception as e:
            print(f"⚠ Stockfish initialization failed: {e}")
            self.engine = None
            return False
    
    def evaluate_transformer(self, board):
        """Evaluate position using transformer model."""
        with torch.no_grad():
            indices = board_to_indices(board).to(self.device)
            value = self.model(indices).item()
            # Scale to centipawn units (approximate)
            return value * 10.0
    
    def evaluate_stockfish(self, board, depth=15):
        """Evaluate position using Stockfish NNUE."""
        if not self.engine:
            return 0.0
        try:
            info = self.engine.analyse(board, chess.engine.Limit(depth=depth))
            score = info["score"].white().score(abs_tol=None)
            return score / 100.0 if score is not None else 0.0
        except Exception as e:
            print(f"Stockfish evaluation error: {e}")
            return 0.0
    
    def get_best_move(self, board, difficulty=3, use_stockfish=True, training_mode=False):
        """
        Get best move using available engines.
        
        Args:
            board: chess.Board instance
            difficulty: 1-10 (affects search time)
            use_stockfish: Use Stockfish if available
            training_mode: If True, use Stockfish as teacher for logging
        
        Returns:
            (move, evaluation)
        """
        if not board.legal_moves:
            return None, 0.0
        
        if use_stockfish and self.engine:
            # Use Stockfish (primary engine)
            time_limit = 0.01 * (difficulty ** 2)
            try:
                result = self.engine.play(board, chess.engine.Limit(time=time_limit))
                move = result.move
                eval_cp = self.evaluate_stockfish(board, depth=12)
                return move, eval_cp
            except Exception as e:
                print(f"Stockfish move error: {e}")
                return self._get_transformer_move(board)
        else:
            # Use transformer
            return self._get_transformer_move(board)
    
    def _get_transformer_move(self, board):
        """Get best move using transformer model (searchless)."""
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return None, 0.0
        
        best_move = legal_moves[0]
        best_value = -2.0
        
        with torch.no_grad():
            for move in legal_moves:
                board.push(move)
                eval_score = self.evaluate_transformer(board)
                board.pop()
                
                # Perspective: maximize for white, minimize for black
                if (board.turn == chess.WHITE and eval_score > best_value) or \
                   (board.turn == chess.BLACK and eval_score < best_value):
                    best_value = eval_score
                    best_move = move
        
        return best_move, best_value
    
    def shutdown(self):
        """Gracefully shutdown engines."""
        if self.engine:
            try:
                self.engine.quit()
                print("✓ Stockfish engine shutdown")
            except:
                pass


# ==================== FLASK APP SETUP ====================

app = Flask(__name__)
CORS(app)

# Initialize AI engine
cobra = CobraAI()
atexit.register(cobra.shutdown)


# ==================== API ENDPOINTS ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check backend status."""
    return jsonify({
        'status': 'ok',
        'transformer': 'loaded',
        'stockfish': 'ready' if cobra.engine else 'unavailable',
        'device': str(cobra.device)
    })


@app.route('/api/move', methods=['POST'])
def get_move():
    """
    Get best move for a position.
    
    POST data:
    {
        "fen": "...",
        "difficulty": 1-10,
        "use_stockfish": true/false,
        "training_mode": true/false
    }
    """
    try:
        data = request.json
        fen = data.get('fen', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        difficulty = int(data.get('difficulty', 5))
        use_stockfish = data.get('use_stockfish', True)
        training_mode = data.get('training_mode', False)
        
        # Clamp difficulty
        difficulty = max(1, min(10, difficulty))
        
        # Create board
        board = chess.Board(fen)
        
        if not board.legal_moves:
            return jsonify({'error': 'No legal moves'}), 400
        
        # Get move
        move, eval_score = cobra.get_best_move(
            board,
            difficulty=difficulty,
            use_stockfish=use_stockfish,
            training_mode=training_mode
        )
        
        if not move:
            return jsonify({'error': 'Could not determine move'}), 500
        
        # Get SAN notation
        san_move = board.san(move)
        
        # Get evaluation (ensure we have both)
        if use_stockfish and cobra.engine:
            eval_score = cobra.evaluate_stockfish(board, depth=12)
        else:
            eval_score = cobra.evaluate_transformer(board)
        
        return jsonify({
            'move': move.uci(),
            'san': san_move,
            'evaluation': round(eval_score, 2),
            'engine': 'stockfish' if use_stockfish else 'transformer'
        })
    
    except Exception as e:
        print(f"Error in /api/move: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/evaluate', methods=['POST'])
def evaluate_position():
    """
    Evaluate a position.
    
    POST data:
    {
        "fen": "...",
        "use_stockfish": true/false
    }
    """
    try:
        data = request.json
        fen = data.get('fen', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        use_stockfish = data.get('use_stockfish', True)
        
        board = chess.Board(fen)
        
        if use_stockfish and cobra.engine:
            eval_score = cobra.evaluate_stockfish(board, depth=12)
            engine_used = 'stockfish'
        else:
            eval_score = cobra.evaluate_transformer(board)
            engine_used = 'transformer'
        
        return jsonify({
            'evaluation': round(eval_score, 2),
            'perspective': 'white',
            'engine': engine_used
        })
    
    except Exception as e:
        print(f"Error in /api/evaluate: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_position():
    """
    Deep analysis of a position (multiple lines, variations).
    
    POST data:
    {
        "fen": "...",
        "depth": 15-20
    }
    """
    try:
        data = request.json
        fen = data.get('fen', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        depth = int(data.get('depth', 15))
        
        if not cobra.engine:
            return jsonify({'error': 'Stockfish not available'}), 503
        
        board = chess.Board(fen)
        
        # Get best move
        info = cobra.engine.analyse(
            board,
            chess.engine.Limit(depth=depth),
            multipv=3  # Get top 3 lines
        )
        
        eval_score = info[0]["score"].white().score(abs_tol=None) / 100.0
        
        return jsonify({
            'evaluation': round(eval_score, 2),
            'depth': depth,
            'engine': 'stockfish'
        })
    
    except Exception as e:
        print(f"Error in /api/analyze: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/bot-info', methods=['GET'])
def bot_info():
    """Get information about available bots and configurations."""
    return jsonify({
        'bots': [
            {
                'id': 'stockfish',
                'name': 'Stockfish NNUE',
                'description': 'Modern chess engine with NNUE evaluation',
                'available': cobra.engine is not None,
                'max_difficulty': 10
            },
            {
                'id': 'transformer',
                'name': 'Cobra Transformer',
                'description': 'Neural network chess evaluator',
                'available': True,
                'max_difficulty': 5
            }
        ],
        'device': str(cobra.device)
    })


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 60)
    print("🐍 COBRA CHESS - Unified Backend")
    print("=" * 60)
    print(f"Device: {cobra.device}")
    print(f"Stockfish: {'✓ Ready' if cobra.engine else '✗ Not available'}")
    print(f"Transformer: ✓ Loaded")
    print("=" * 60)
    print("Starting server at http://0.0.0.0:5000")
    print("=" * 60)
    
    app.run(debug=False, port=5000, host='0.0.0.0', threaded=True)
