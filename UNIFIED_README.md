# 🐍 Cobra Chess - Unified AI Chess Platform v2.0

A high-performance chess application combining transformer neural networks with Stockfish NNUE evaluation, featuring a modern Chess.com-style interface.

## Features

### 🎮 Game Features
- **Real-time Evaluation**: Live evaluation bar showing position assessment
- **Multiple Difficulty Levels**: 1-10 difficulty selector
- **Dual Engine Support**: Switch between Stockfish NNUE and Transformer models
- **Move History**: Complete move notation display
- **Undo Function**: Take back moves during gameplay
- **Sound Effects**: Optional audio feedback for moves
- **Board Flip**: Play from either side
- **Game Timer**: Track elapsed game time

### 🤖 AI Engines
- **Stockfish NNUE**: Industry-standard chess engine with NNUE evaluation
- **Cobra Transformer**: Custom neural network evaluator trained on chess positions
- **Hybrid Mode**: Automatic fallback between engines

### 🎨 UI/UX
- **Chess.com-like Interface**: Professional dark theme matching industry standards
- **Responsive Design**: Adapts to different screen sizes
- **Real-time Updates**: Smooth evaluation bar and position assessment
- **Intuitive Controls**: Click pieces to move with visual hints

## Architecture

### Backend (Flask + PyTorch)
```
app_unified.py
├── CobraTransformer (PyTorch Neural Network)
│   ├── Positional Encoding
│   ├── Multi-Head Attention
│   └── Feed-forward layers
├── CobraAI (Hybrid Engine)
│   ├── Transformer Inference
│   ├── Stockfish Integration
│   └── Board Evaluation
└── Flask API
    ├── /api/move - Get best move
    ├── /api/evaluate - Evaluate position
    ├── /api/analyze - Deep analysis
    ├── /api/bot-info - Bot capabilities
    └── /api/health - System status
```

### Frontend (HTML5 + chess.js)
```
index_new.html + script.js
├── ChessUI (UI Manager)
│   ├── Board Rendering
│   ├── Move Input Handler
│   └── Real-time Updates
├── ChessGame (Game Logic)
│   ├── chess.js Integration
│   ├── Move Validation
│   └── Game State
├── CobraAPI (Backend Communication)
│   ├── Move Requests
│   ├── Position Evaluation
│   └── Health Checks
└── SoundEngine (Audio)
    ├── Move Sounds
    ├── Capture Sounds
    └── Check Alert
```

## Installation

### Prerequisites
- Python 3.8+
- Node.js (optional, for better tooling)
- Stockfish (optional, for enhanced strength)

### Quick Start

1. **Clone and Setup**:
   ```bash
   cd /Users/backup/Desktop/cobra_chess_web
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Activate Virtual Environment**:
   ```bash
   source venv.venv/bin/activate
   ```

3. **Start Backend**:
   ```bash
   python3 app_unified.py
   ```
   
   You should see:
   ```
   ============================================================
   🐍 COBRA CHESS - Unified Backend
   ============================================================
   Device: cpu
   Stockfish: ✓ Ready
   Transformer: ✓ Loaded
   ============================================================
   Starting server at http://0.0.0.0:5000
   ============================================================
   ```

4. **Start Frontend** (in another terminal):
   ```bash
   python3 -m http.server 8000
   ```

5. **Open Browser**:
   ```
   http://localhost:8000
   ```

## Usage Guide

### Game Controls

| Action | Method |
|--------|--------|
| **Move Piece** | Click piece, then click destination |
| **New Game** | Click "New Game" button |
| **Undo Move** | Click "Undo" button |
| **Get Hint** | Click "Hint" button |
| **Flip Board** | Click "Flip" button or change color |

### Settings

#### Engine Selection
- **Hybrid**: Uses Stockfish primarily, falls back to Transformer
- **Stockfish NNUE**: Pure Stockfish evaluation
- **Transformer**: Neural network only (faster, less accurate)

#### Difficulty Levels
- **1** - Beginner (100ms thinking time)
- **5** - Intermediate (2s thinking time)
- **10** - Master (10s thinking time)

Each level between is scaled proportionally.

#### Play As
- **White**: You move first
- **Black**: Cobra moves first

### Features

| Feature | Description |
|---------|-------------|
| **Sound Effects** | Toggle move audio |
| **Highlight Moves** | Show valid moves with highlights |
| **Animations** | Smooth piece movement |

## API Documentation

### Health Check
```bash
GET /api/health

Response:
{
    "status": "ok",
    "transformer": "loaded",
    "stockfish": "ready",
    "device": "cpu"
}
```

### Get Best Move
```bash
POST /api/move
Content-Type: application/json

{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "difficulty": 5,
    "use_stockfish": true,
    "training_mode": false
}

Response:
{
    "move": "e2e4",
    "san": "e4",
    "evaluation": 0.35,
    "engine": "stockfish"
}
```

### Evaluate Position
```bash
POST /api/evaluate
Content-Type: application/json

{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "use_stockfish": true
}

Response:
{
    "evaluation": 0.35,
    "perspective": "white",
    "engine": "stockfish"
}
```

### Analyze Position
```bash
POST /api/analyze
Content-Type: application/json

{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "depth": 15
}

Response:
{
    "evaluation": 0.35,
    "depth": 15,
    "engine": "stockfish"
}
```

### Get Bot Info
```bash
GET /api/bot-info

Response:
{
    "bots": [
        {
            "id": "stockfish",
            "name": "Stockfish NNUE",
            "description": "Modern chess engine with NNUE evaluation",
            "available": true,
            "max_difficulty": 10
        },
        {
            "id": "transformer",
            "name": "Cobra Transformer",
            "description": "Neural network chess evaluator",
            "available": true,
            "max_difficulty": 5
        }
    ],
    "device": "cpu"
}
```

## File Structure

```
cobra_chess_web/
├── app_unified.py          # Main Flask backend (UNIFIED)
├── script.js               # Frontend game logic (UNIFIED)
├── index_new.html          # Main UI (UPDATED)
├── styles.css              # Styling with CSS variables
├── train_cobra.py          # Training script for transformer
├── setup.sh                # Setup script
├── requirements.txt        # Python dependencies
├── models/
│   └── transformer_cobra.pt  # Pre-trained transformer weights
├── venv.venv/              # Python virtual environment
└── README.md               # This file
```

## Technical Details

### Transformer Architecture

The CobraTransformer uses:
- **Input Layer**: 13-token embedding (empty + 12 piece types)
- **Positional Encoding**: Sinusoidal positional encoding for 64 squares
- **Transformer Blocks**: 6 encoder layers with 8 attention heads
- **Output Layer**: Dense layers to produce [-1, 1] evaluation

### Board Representation

Pieces are encoded as indices:
```
0: Empty
1-6: White pieces (P, N, B, R, Q, K)
7-12: Black pieces (p, n, b, r, q, k)
```

Each position maps to a 64-dimensional vector representing the board.

### Evaluation Scale

Evaluations are reported in centipawns (cp):
- **Positive**: White advantage
- **Negative**: Black advantage
- **Magnitude**: Advantage size (1 point ≈ 1 pawn advantage)

Examples:
- `+0.5` = White slightly better
- `+5.0` = White winning
- `-3.0` = Black winning

## Performance

### Typical Response Times
- **Move Selection**: 100-10,000ms (depends on difficulty)
- **Position Evaluation**: <100ms
- **Deep Analysis**: 1-10 seconds

### Resource Usage
- **Memory**: ~500MB Python + ~200MB Models
- **CPU**: Single-threaded Stockfish uses 1 core, can use 4+
- **Device**: CPU recommended, GPU optional

## Troubleshooting

### Backend won't start
```bash
# Check Python installation
python3 --version

# Check dependencies
pip3 list | grep flask

# Run with verbose output
python3 app_unified.py
```

### Stockfish not found
```bash
# macOS
brew install stockfish

# Ubuntu/Debian
sudo apt-get install stockfish

# Check installation
which stockfish
```

### CORS errors
- Ensure backend is running on port 5000
- Check browser console for specific errors
- Verify `Flask-Cors` is installed

### No evaluation updates
- Check backend health: `curl http://localhost:5000/api/health`
- Verify network requests in browser DevTools
- Check that game state is valid FEN

## Development

### Training New Weights

```bash
python3 train_cobra.py
```

This will:
1. Generate random chess positions
2. Evaluate with Stockfish
3. Train transformer on evaluations
4. Save weights to `models/transformer_cobra.pt`

### Extending the API

Add new endpoints to `app_unified.py`:

```python
@app.route('/api/your-endpoint', methods=['POST'])
def your_function():
    data = request.json
    # Your logic here
    return jsonify({'result': value})
```

Then call from frontend:
```javascript
const response = await fetch('http://localhost:5000/api/your-endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
```

## Performance Optimization

### For Faster Moves
1. Reduce difficulty setting
2. Switch to Transformer engine
3. Lower `depth` parameter in analysis

### For Better Accuracy
1. Increase difficulty setting
2. Use Stockfish instead of Transformer
3. Wait for deeper analysis

### For Resource Conservation
1. Reduce Stockfish threads: update `engine.configure({"Threads": 2})`
2. Use transformer model (lighter)
3. Cache evaluations for repeated positions

## License

This project is provided as-is for educational and personal use.

## Credits

- **Stockfish**: Open-source chess engine
- **chess.js**: JavaScript chess library
- **PyTorch**: Deep learning framework
- **Flask**: Web framework

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Verify backend logs

---

**Enjoy playing against Cobra! 🐍♟️**

Version 2.0 - Unified Platform
