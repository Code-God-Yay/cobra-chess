# 🚀 COBRA CHESS v2.0 - QUICK START GUIDE

## 30-Second Setup

```bash
# Terminal 1: Start Backend
cd /Users/backup/Desktop/cobra_chess_web
source venv.venv/bin/activate
python3 app_unified.py

# Terminal 2: Start Frontend
cd /Users/backup/Desktop/cobra_chess_web
python3 -m http.server 8000

# Browser: Open Game
http://localhost:8000
```

---

## What You Get

### ✅ Complete Refactored System
- **Single unified backend** (`app_unified.py`) replacing 3 fragmented files
- **Modern frontend** (`script.js`) with chess.js integration
- **Professional UI** (`index_new.html`) matching Chess.com aesthetic
- **Comprehensive styling** (`styles.css`) with dark theme

### ✅ AI Capabilities
- **Stockfish NNUE**: Industry-standard chess engine (when available)
- **Cobra Transformer**: Custom neural network evaluator
- **Hybrid Mode**: Automatic fallback between engines
- **Difficulty 1-10**: Fully tunable bot challenge

### ✅ Game Features
- **Real-time evaluation** with animated bar
- **Move validation** before API calls (chess.js)
- **Undo/Hint** functionality
- **Sound effects** (toggle enabled)
- **Move history** with proper notation
- **Board flip** and color selection
- **Game timer** and status display

---

## File Mapping

| Component | New File | Purpose |
|-----------|----------|---------|
| Backend | `app_unified.py` | Flask API + CobraTransformer + Stockfish |
| Frontend | `script.js` | Complete game logic & UI |
| HTML | `index_new.html` | Professional interface |
| Styles | `styles.css` | Chess.com-like dark theme |
| Docs | `UNIFIED_README.md` | Full documentation |
| Setup | `setup.sh` | Automated environment |

---

## Key Differences (Before → After)

### Before (Fragmented)
- ❌ 3 different backend implementations (app.py, backend.py, cobra.py)
- ❌ Unclear which version to use
- ❌ chess-engine.js had 900+ lines of mixed logic
- ❌ No chess.js integration for move validation
- ❌ Inconsistent API endpoints
- ❌ Poor error handling

### After (Unified)
- ✅ **1 production-ready backend** with clear architecture
- ✅ **Clean SPA** with proper separation of concerns
- ✅ **chess.js integration** for bulletproof move validation
- ✅ **RESTful API** with consistent endpoints
- ✅ **Comprehensive error handling** throughout
- ✅ **Professional UI** matching industry standards

---

## Testing the System

### 1. Verify Backend Running
```bash
curl http://localhost:5000/api/health
# Should return:
# {"status":"ok","transformer":"loaded","stockfish":"ready",...}
```

### 2. Try a Move Request
```bash
curl -X POST http://localhost:5000/api/move \
  -H "Content-Type: application/json" \
  -d '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","difficulty":5}'
```

### 3. Play in Browser
- Open http://localhost:8000
- Click "New Game"
- Click a white piece, then click where to move
- Watch evaluation bar update in real-time
- Try changing difficulty and engine type

---

## Common Actions

| Goal | How |
|------|-----|
| Change difficulty | Use "Difficulty" dropdown (1-10) |
| Use Stockfish only | Select "Stockfish NNUE" in Engine |
| Play as Black | Select "Black" in Play As |
| Get hint | Click "Hint" button |
| Undo moves | Click "Undo" button |
| Mute sounds | Uncheck "Sound Effects" |
| Reset game | Click "New Game" |
| Flip board | Click "Flip" button |

---

## Architecture Overview

```
┌─ Frontend (Browser) ────────────────────┐
│                                          │
│  HTML5 + CSS3  →  script.js  ←─ chess.js│
│    (UI)          (Game Logic)  (Validation)
│                                          │
│  ↕ Real-time API calls                   │
│                                          │
└──────────────────────────────────────────┘
          ↓ HTTP REST API ↓
┌─ Backend (Flask) ───────────────────────┐
│                                          │
│  /api/move      → CobraAI.get_move()    │
│  /api/evaluate  → CobraAI.evaluate()    │
│  /api/analyze   → Stockfish deep search │
│  /api/health    → Status check          │
│                                          │
│  ┌─ Hybrid Engine ──────────────────┐   │
│  │ • Stockfish NNUE (primary)       │   │
│  │ • Cobra Transformer (fallback)   │   │
│  │ • Device detection (CPU/MPS)     │   │
│  └──────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

---

## Troubleshooting

### Issue: "Failed to fetch"
**Solution**: Ensure backend is running
```bash
python3 app_unified.py
```

### Issue: Moves too slow
**Solution**: 
- Lower difficulty setting
- Switch to Transformer engine
- Check CPU usage

### Issue: Invalid move
**Solution**: 
- Make sure you're clicking valid squares
- Open DevTools (F12) to see errors
- Check that board is in valid position

### Issue: Stockfish not found
**Solution**: Install or use Transformer
```bash
brew install stockfish  # macOS
# App will still work with transformer model
```

---

## Performance Tips

| Goal | Action |
|------|--------|
| Faster moves | Lower difficulty or use Transformer |
| Stronger opponent | Increase difficulty or use Stockfish |
| Lower CPU usage | Use Transformer engine |
| Better evaluation | Increase difficulty on Stockfish |

---

## What's Different From Original Code

### Backend
```
BEFORE: 3 separate files with duplicate code
  - app.py (CobraTransformer)
  - backend.py (NNUEAI + HybridEngine)
  - cobra.py (CobraNNUE)

AFTER: 1 unified file with clear structure
  - app_unified.py
    ├── PositionalEncoding class
    ├── CobraTransformer class
    ├── CobraAI class (hybrid engine)
    └── Flask API with 5 endpoints
```

### Frontend
```
BEFORE: Mixed logic in chess-engine.js
  - Game logic + UI rendering together
  - No chess.js dependency
  - Move validation on server only

AFTER: Clean architecture in script.js
  - ChessGame: Game logic (uses chess.js)
  - ChessUI: UI rendering & events
  - CobraAPI: Backend communication
  - SoundEngine: Audio effects
  - Move validation happens CLIENT-SIDE
```

### HTML
```
BEFORE: Outdated structure
  - Missing bot configuration section
  - Unclear element relationships
  - Limited CSS integration

AFTER: Modern semantic HTML5
  - Bot section with controls
  - Responsive 3-column grid layout
  - Proper accessibility (label/for)
  - chess.js library from CDN
```

---

## API Endpoints Reference

### Health Check
```
GET /api/health
→ {"status":"ok","transformer":"loaded","stockfish":"ready",...}
```

### Get Move
```
POST /api/move
← {"fen":"...","difficulty":5,"use_stockfish":true}
→ {"move":"e2e4","san":"e4","evaluation":0.35,"engine":"stockfish"}
```

### Evaluate Position
```
POST /api/evaluate
← {"fen":"...","use_stockfish":true}
→ {"evaluation":0.35,"perspective":"white","engine":"stockfish"}
```

### Get Bot Info
```
GET /api/bot-info
→ {"bots":[{"id":"stockfish","name":"...","available":true,...},...]}
```

---

## System Requirements

- Python 3.8+
- ~700MB RAM (Python + models)
- ~500MB disk space
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Single CPU core (Stockfish can use more)

**Optional:**
- Stockfish binary (for NNUE evaluation)
- 4+ CPU cores (for faster Stockfish)

---

## Debug Checklist

- [ ] Backend running: `curl http://localhost:5000/api/health`
- [ ] Frontend serving: `curl http://localhost:8000`
- [ ] Browser console showing no errors (F12)
- [ ] Network tab shows `/api/move` requests
- [ ] Response includes `move`, `evaluation`, `engine`
- [ ] Board updates after move
- [ ] Evaluation bar animates

---

## Next Steps

1. **Play a Game**
   - Start both servers
   - Open browser
   - Click pieces to move
   - Watch AI respond

2. **Experiment with Settings**
   - Try different difficulties
   - Switch engines
   - Toggle sound
   - Flip board

3. **Monitor Performance**
   - Note response times at different difficulties
   - Check resource usage in system monitor
   - Observe move quality

4. **Read Full Documentation**
   - See `UNIFIED_README.md` for complete guide
   - See `IMPLEMENTATION_SUMMARY.md` for technical details

---

## Quick Deployment

To deploy publicly (e.g., on a server):

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app_unified:app

# Or use included setup script for development
python3 app_unified.py
```

---

**Status: ✅ READY TO PLAY**

All components integrated and tested.

🐍 **Start playing now!** ♟️

For issues, see UNIFIED_README.md troubleshooting section.
