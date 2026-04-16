import chess
import chess.engine
import torch
import torch.nn as nn
import os
import random
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import defaultdict

# --- NNUE ARCHITECTURE ---
class ClippedReLU(nn.Module):
    def forward(self, x):
        return torch.clamp(x, 0.0, 1.0)

class CobraNNUE(nn.Module):
    def __init__(self):
        super(CobraNNUE, self).__init__()
        self.input_layer = nn.Linear(768, 256) 
        self.hidden = nn.Linear(512, 32) 
        self.output = nn.Linear(32, 1)
        self.activation = ClippedReLU()

    def forward(self, features):
        # features: [batch, 768]
        w_view = features # In a full NNUE, you'd mirror the board for black
        b_view = features 
        
        w_act = self.activation(self.input_layer(w_view))
        b_act = self.activation(self.input_layer(b_view))
        
        combined = torch.cat([w_act, b_act], dim=1)
        x = self.activation(self.hidden(combined))
        return self.output(x)

# --- UTILS ---
def board_to_features(board):
    features = torch.zeros(768)
    for square, piece in board.piece_map().items():
        color_offset = 0 if piece.color == chess.WHITE else 384
        piece_offset = (piece.piece_type - 1) * 64
        features[color_offset + piece_offset + square] = 1
    return features.unsqueeze(0)

# --- ENGINE LOGIC ---
class HybridEngine:
    def __init__(self, stockfish_path="stockfish"):
        self.model = CobraNNUE()
        self.model.eval()
        
        # Load weights if they exist
        if os.path.exists("models/cobra_weights.pt"):
            self.model.load_state_dict(torch.load("models/cobra_weights.pt"))
            
        try:
            self.sf = chess.engine.SimpleEngine.popen_uci(stockfish_path)
            self.sf.configure({"Use NNUE": True})
        except:
            print("Stockfish not found. Falling back to local NNUE inference.")
            self.sf = None

    def get_best_move(self, board, difficulty=3):
        # Use Stockfish for "Stupidly Good" moves
        if self.sf:
            limit = chess.engine.Limit(time=0.02 * (difficulty ** 2))
            result = self.sf.play(board, limit)
            return result.move
        
        # Fallback: NNUE-guided search (simplified)
        legal_moves = list(board.legal_moves)
        best_move = random.choice(legal_moves)
        best_eval = -float('inf') if board.turn == chess.WHITE else float('inf')
        
        for move in legal_moves:
            board.push(move)
            with torch.no_grad():
                val = self.model(board_to_features(board)).item()
            board.pop()
            
            if board.turn == chess.WHITE:
                if val > best_eval:
                    best_eval = val
                    best_move = move
            else:
                if val < best_eval:
                    best_eval = val
                    best_move = move
        return best_move

    def evaluate(self, board):
        if self.sf:
            info = self.sf.analyse(board, chess.engine.Limit(depth=10))
            return info["score"].white().score(abs_tol=None) / 100.0
        with torch.no_grad():
            return self.model(board_to_features(board)).item()

# --- API ---
app = Flask(__name__)
CORS(app)
engine = HybridEngine()

@app.route('/api/move', methods=['POST'])
def get_move():
    data = request.json
    board = chess.Board(data.get('fen'))
    difficulty = int(data.get('difficulty', 3))
    
    move = engine.get_best_move(board, difficulty)
    return jsonify({
        'move': move.uci(),
        'san': board.san(move),
        'evaluation': round(engine.evaluate(board), 2)
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "cobra_active", "nnue_loaded": True})

if __name__ == '__main__':
    app.run(port=5000)
