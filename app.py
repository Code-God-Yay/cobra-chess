import chess
import chess.engine
import torch
import torch.nn as nn
import os
import atexit
import math
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- TRANSFORMER ARCHITECTURE ---
class PositionalEncoding(nn.Module):
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
    def __init__(self, embed_dim=256, nhead=8, num_layers=6):
        super().__init__()
        self.embedding = nn.Embedding(13, embed_dim)
        self.pos_encoder = PositionalEncoding(embed_dim)
        layer = nn.TransformerEncoderLayer(d_model=embed_dim, nhead=nhead, batch_first=True)
        self.transformer = nn.TransformerEncoder(layer, num_layers=num_layers)
        self.fc = nn.Sequential(nn.Linear(embed_dim * 64, 1), nn.Tanh())

    def forward(self, x):
        x = self.pos_encoder(self.embedding(x))
        x = self.transformer(x).view(x.size(0), -1)
        return self.fc(x)

# --- UTILS ---
def board_to_indices(board):
    pm = {'P':1,'N':2,'B':3,'R':4,'Q':5,'K':6,'p':7,'n':8,'b':9,'r':10,'q':11,'k':12}
    indices = torch.zeros(64, dtype=torch.long)
    for sq in range(64):
        p = board.piece_at(sq)
        if p: indices[sq] = pm[p.symbol()]
    return indices.unsqueeze(0)

class HybridEngine:
    def __init__(self, stockfish_path="/opt/homebrew/bin/stockfish"):
        self.device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
        self.model = CobraTransformer().to(self.device)
        if os.path.exists("models/transformer_cobra.pt"):
            self.model.load_state_dict(torch.load("models/transformer_cobra.pt", map_location=self.device))
        self.model.eval()
        try:
            self.sf = chess.engine.SimpleEngine.popen_uci(stockfish_path)
        except:
            self.sf = None

    def get_best_move(self, board, difficulty):
        if self.sf:
            limit = chess.engine.Limit(time=0.02 * (difficulty**2))
            return self.sf.play(board, limit).move
        
        # Transformer Searchless Fallback
        moves = list(board.legal_moves)
        best_m, best_v = moves[0], -2.0
        for m in moves:
            board.push(m)
            with torch.no_grad():
                v = self.model(board_to_indices(board).to(self.device)).item()
            board.pop()
            if (board.turn == chess.WHITE and v > best_v) or (board.turn == chess.BLACK and v < best_v):
                best_v, best_m = v, m
        return best_m

app = Flask(__name__)
CORS(app)
engine = HybridEngine()
atexit.register(lambda: engine.sf.quit() if engine.sf else None)

@app.route('/api/move', methods=['POST'])
def move():
    data = request.json
    board = chess.Board(data.get('fen'))
    move = engine.get_best_move(board, int(data.get('difficulty', 3)))
    
    # Calculate Eval
    if engine.sf:
        info = engine.sf.analyse(board, chess.engine.Limit(depth=10))
        score = info["score"].white().score(abs_tol=None) / 100.0
    else:
        with torch.no_grad():
            score = engine.model(board_to_indices(board).to(engine.device)).item() * 10

    return jsonify({'move': move.uci(), 'san': board.san(move), 'eval': round(score, 2)})

if __name__ == '__main__':
    app.run(port=5000)
