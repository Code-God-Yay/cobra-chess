import torch
import torch.nn as nn
import torch.optim as optim
import chess
from stockfish import Stockfish
import random
import os
import math

# --- TRANSFORMER ARCHITECTURE (The missing part) ---
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
        encoder_layer = nn.TransformerEncoderLayer(d_model=embed_dim, nhead=nhead, batch_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
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
    return indices

# --- TRAINING ---
def train():
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    # Path verified from your 'which stockfish'
    sf = Stockfish("/opt/homebrew/bin/stockfish")
    
    model = CobraTransformer().to(device)
    optimizer = optim.AdamW(model.parameters(), lr=1e-4)
    criterion = nn.HuberLoss()

    if not os.path.exists("models"): os.makedirs("models")

    print(f"FORCING IMPROVEMENT: Training on {device}")
    for epoch in range(50):
        features, targets = [], []
        for _ in range(64):
            board = chess.Board()
            for _ in range(random.randint(5, 50)):
                if board.is_game_over(): break
                board.push(random.choice(list(board.legal_moves)))
            
            sf.set_fen_position(board.fen())
            ev = sf.get_evaluation()
            val = ev['value'] if ev['type'] == 'cp' else (1000 if ev['value'] > 0 else -1000)
            features.append(board_to_indices(board))
            targets.append(torch.tensor([max(min(val / 1000.0, 1.0), -1.0)]))

        X, Y = torch.stack(features).to(device), torch.stack(targets).to(device)
        optimizer.zero_grad()
        loss = criterion(model(X), Y)
        loss.backward()
        optimizer.step()
        if epoch % 5 == 0: print(f"Epoch {epoch} | Loss: {loss.item():.6f}")

    torch.save(model.state_dict(), "models/transformer_cobra.pt")
    print("Transformer weights saved to models/transformer_cobra.pt")

if __name__ == "__main__":
    train()
