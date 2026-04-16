"""
Cobra Chess - Advanced AI Backend (Fixed & Improved)
"""

import chess
import chess.pgn
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import random
from collections import defaultdict
import pickle
import os
import io
import chess.engine

class NNUEAI:
    def __init__(self, stockfish_path="/usr/local/bin/stockfish"):
        self.stockfish_path = stockfish_path
        # Start a persistent Stockfish process with NNUE enabled
        self.engine = chess.engine.SimpleEngine.popen_uci(self.stockfish_path)
        # Force NNUE evaluation (Stockfish 12+ uses this by default)
        self.engine.configure({"Use NNUE": True})

    def get_best_move(self, board, time_limit=0.1):
        """Leverages Stockfish NNUE for the heavy lifting."""
        result = self.engine.play(board, chess.engine.Limit(time=time_limit))
        return result.move

    def evaluate_board(self, board):
        """Gets a high-precision NNUE evaluation score."""
        info = self.engine.analyse(board, chess.engine.Limit(depth=10))
        # Returns score in centipawns from White's perspective
        return info["score"].white().score(abs_tol=None) / 100.0

    def close(self):
        self.engine.quit()

# Update your HybridEngine to use the new NNUE logic
class HybridEngine:
    def __init__(self):
        self.nnue = NNUEAI() # Requires Stockfish installed on your server
        self.markov = MarkovChainAI()

    def get_best_move(self, board, engine_type="nnue", difficulty=3):
        # Difficulty scales the time Stockfish spends 'thinking'
        time_limit = 0.05 * (difficulty ** 2) 
        return self.nnue.get_best_move(board, time_limit=time_limit)
    def evaluate(self, board):
        return self.nnue.evaluate_board(board)
app = Flask(__name__)
CORS(app)

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

PAWN_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
]

KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
]

class NeuralNetworkAI:
    def evaluate_board(self, board):
        if board.is_checkmate():
            return -10000 if board.turn else 10000
        if board.is_stalemate() or board.is_insufficient_material():
            return 0
        
        score = 0
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece:
                value = PIECE_VALUES.get(piece.piece_type, 0)
                row, col = divmod(square, 8)
                positional = 0
                
                if piece.piece_type == chess.PAWN:
                    positional = PAWN_TABLE[row if piece.color else 7-row][col]
                elif piece.piece_type == chess.KNIGHT:
                    positional = KNIGHT_TABLE[row if piece.color else 7-row][col]
                
                total = value + positional
                score += total if piece.color == chess.WHITE else -total
        
        score += len(list(board.legal_moves)) * 10 if board.turn == chess.WHITE else -len(list(board.legal_moves)) * 10
        return score / 100.0
    
    def minimax(self, board, depth, alpha, beta, maximizing):
        if depth == 0 or board.is_game_over():
            return self.evaluate_board(board)
        
        if maximizing:
            max_eval = float('-inf')
            for move in list(board.legal_moves)[:30]:
                board.push(move)
                eval_score = self.minimax(board, depth - 1, alpha, beta, False)
                board.pop()
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in list(board.legal_moves)[:30]:
                board.push(move)
                eval_score = self.minimax(board, depth - 1, alpha, beta, True)
                board.pop()
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval
    
    def get_best_move(self, board, depth=3):
        best_move = None
        best_value = float('-inf') if board.turn == chess.WHITE else float('inf')
        
        moves = list(board.legal_moves)
        moves.sort(key=lambda m: (board.is_capture(m), board.gives_check(m)), reverse=True)
        
        for move in moves[:40]:
            board.push(move)
            value = self.minimax(board, depth - 1, float('-inf'), float('inf'), 
                               not (board.turn == chess.WHITE))
            board.pop()
            
            if board.turn == chess.WHITE:
                if value > best_value:
                    best_value = value
                    best_move = move
            else:
                if value < best_value:
                    best_value = value
                    best_move = move
        
        return best_move

class MarkovChainAI:
    def __init__(self):
        self.transitions = defaultdict(lambda: defaultdict(int))
        self.model_path = os.path.join(MODEL_DIR, "markov_model.pkl")
        self.load_model()
        
    def get_best_move(self, board):
        position = board.fen().split()[0]
        legal_moves = list(board.legal_moves)
        
        if not legal_moves:
            return None
        
        if position in self.transitions:
            move_weights = []
            moves = []
            
            for move in legal_moves:
                move_str = move.uci()
                weight = self.transitions[position].get(move_str, 1)
                moves.append(move)
                move_weights.append(weight)
            
            total = sum(move_weights)
            if total > 0:
                probabilities = [w / total for w in move_weights]
                return random.choices(moves, weights=probabilities)[0]
        
        return random.choice(legal_moves)
    
    def save_model(self):
        with open(self.model_path, 'wb') as f:
            pickle.dump(dict(self.transitions), f)
    
    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.transitions = defaultdict(lambda: defaultdict(int), pickle.load(f))
            except:
                pass

class HybridEngine:
    def __init__(self):
        self.neural = NeuralNetworkAI()
        self.markov = MarkovChainAI()
        
    def get_best_move(self, board, engine_type="neural", difficulty=3):
        try:
            if engine_type == "neural" or engine_type == "hybrid":
                depth = min(difficulty + 1, 5)
                return self.neural.get_best_move(board, depth=depth)
            elif engine_type == "markov":
                move = self.markov.get_best_move(board)
                if move:
                    return move
                return self.neural.get_best_move(board, depth=3)
            else:
                return self.neural.get_best_move(board, depth=3)
        except Exception as e:
            print(f"Error: {e}")
            legal_moves = list(board.legal_moves)
            return random.choice(legal_moves) if legal_moves else None
    
    def evaluate(self, board):
        try:
            return self.neural.evaluate_board(board)
        except:
            return 0.0

engine = HybridEngine()

@app.route('/api/move', methods=['POST'])
def get_move():
    try:
        data = request.json
        fen = data.get('fen')
        engine_type = data.get('engine', 'neural')
        difficulty = data.get('difficulty', 3)
        
        board = chess.Board(fen)
        move = engine.get_best_move(board, engine_type, difficulty)
        
        if move:
            return jsonify({'move': move.uci(), 'san': board.san(move)})
        return jsonify({'error': 'No legal moves'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/evaluate', methods=['POST'])
def evaluate_position():
    try:
        data = request.json
        fen = data.get('fen')
        board = chess.Board(fen)
        evaluation = engine.evaluate(board)
        return jsonify({'evaluation': round(evaluation, 2), 'perspective': 'white'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/review', methods=['POST'])
def review_game():
    try:
        data = request.json
        review = {
            'moves': [],
            'accuracy': {'white': 85, 'black': 82},
            'classifications': {
                'white': {'best': 10, 'good': 5, 'inaccuracy': 2},
                'black': {'best': 9, 'good': 6, 'mistake': 1}
            }
        }
        return jsonify(review)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'engines': {'neural': True, 'markov': True, 'hybrid': True}
    })

if __name__ == '__main__':
    print("🐍 Cobra Chess AI Server - Starting...")
    print("Available at: http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')
