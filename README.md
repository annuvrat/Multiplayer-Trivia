# QuizArena ⚡

> Real-time AI-powered multiplayer quiz battles. Create rooms, generate trivia with AI, and compete live.

QuizArena is a modern multiplayer trivia game where players join rooms (arenas), generate custom quiz questions via AI (Groq/Llama), and compete in real-time quiz battles. Supports **Free-for-All** and **Team Deathmatch** modes with live leaderboards, lobby chat, and match replay.

**Deployed Link :**| quizme.annuvrat.com
---

## Features

- **AI-Powered Question Generation** — Generate trivia on any topic, difficulty, and count using Groq's Llama 3.3-70B
- **Real-Time Multiplayer** — Socket.IO-powered instant game updates, leaderboards, and chat
- **Two Game Modes** — Free-for-All (solo) and Team Deathmatch (Sapphire vs Crimson)
- **Live Leaderboards** — Scores update in real-time as answers roll in
- **Lobby Chat** — Text messaging with emoji reactions
- **Match History & Replay** — Every quiz is saved; rewatch with interactive answer review
- **Google OAuth** — Firebase Authentication with guest play support
- **Sound Effects** — Immersive audio feedback (correct/wrong/submit/music)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | [Bun](https://bun.sh) 1.3.5+ |
| **Backend** | Express 5 + TypeScript |
| **Real-Time** | Socket.IO 4 |
| **Frontend** | React 19 + TypeScript + Vite 8 |
| **Styling** | Tailwind CSS 3 |
| **Database (State)** | Redis / Valkey via ioredis |
| **Database (Persistence)** | PostgreSQL (Neon serverless) |
| **Auth** | Firebase Admin SDK + Firebase Client SDK |
| **AI** | Groq API (Llama 3.3-70B) via OpenAI SDK |
| **Deployment** | Docker / docker-compose, Vercel (frontend) |

---

## Architecture

### Layered Design

```
┌────────────────────────────────────────────────────────────┐
│                      React Client                          │
│         Landing · Auth · Lobby · Quiz · Results            │
│              Socket.IO Client ↔ REST fetch                  │
└────────────────────────┬───────────────────────────────────┘
                         │ HTTP + WebSocket
                         ▼
┌────────────────────────────────────────────────────────────┐
│                    Express + Socket.IO                      │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│  Routes  │Controllers│ Services │   Utils   │ WebSocket    │
│  (HTTP)  │  (Thin)  │ (Logic)  │ (Engine)  │ Handlers     │
├──────────┴──────────┼──────────┴──────────┴────────────────┤
│     Auth Middleware (Firebase Token Verification)          │
├────────────────────────────────────────────────────────────┤
│  Redis (Ephemeral State)      PostgreSQL (Persistent Data) │
│  • Rooms, players, questions  • Users, matches, history    │
│  • Leaderboard, answers       • Quiz snapshots (JSONB)     │
│  • Team assignments           • Match participants         │
└────────────────────────────────────────────────────────────┘
```

### Key Patterns

- **Service Layer** — All business logic lives in `src/services/`; controllers are thin
- **Pub-Sub** — Socket.IO drives all real-time events (question updates, leaderboard changes, chat)
- **TTL-Based Cache** — Redis keys auto-expire after 24 hours; refreshed on mutation
- **State Machine** — Rooms transition `waiting → playing → finished → waiting` (via restart)
- **Background Persistence** — Match results written to Postgres asynchronously via `setImmediate`
- **Pipeline Batching** — Redis pipelines for batch TTL refresh and leaderboard init

### Data Flow

```
1. Player creates/joins room       → HTTP POST → Controller → Service → Redis
2. Host generates questions        → HTTP POST → Controller → Service → Groq API → Redis
3. Host starts game                → HTTP POST → Controller → Service → Socket.IO emit
4. Game engine loop                → setTimeout chain in gameEngine.ts
   └─ emit "new_question"          → Socket.IO → Client renders Quiz UI
   └─ setTimeout(10s) → emit leaderboard → Client shows scores
   └─ setTimeout(5s)  → recurse to next question
5. Player submits answer           → HTTP POST → Controller → Service → Redis → Socket.IO
6. Game ends                       → Service persists to Postgres → Socket.IO emits results
```

---

## How the Game Works

### Game Flow

```
Create Room ──► Join Room ──► Generate Quiz ──► Start Game
                                                   │
                     ┌──────────────────────────────┤
                     ▼                              ▼
               Free-for-All                  Team Deathmatch
            (starts immediately)          (10s lobby countdown)
                     │                              │
                     └──────────────┬───────────────┘
                                    ▼
                          ┌─────────────────┐
                          │  Question Loop   │
                          │  ┌───────────┐   │
                          │  │ Question  │   │  ← 10s to answer
                          │  │ (10s)     │   │
                          │  └─────┬─────┘   │
                          │        ▼         │
                          │  ┌───────────┐   │
                          │  │ Mid-Round │   │  ← 5s leaderboard
                          │  │ Leaderbrd │   │
                          │  └───────────┘   │
                          │        │         │
                          │        ▼         │
                          │  Repeat until    │
                          │  questions done  │
                          └────────┬────────┘
                                   ▼
                          ┌─────────────────┐
                          │   Game Over      │
                          │  ├─ Winner       │
                          │  ├─ Scores       │
                          │  ├─ Replay       │
                          │  └─ Restart/Leave│
                          └─────────────────┘
```

### The 10-Second Engine

Defined in `src/utils/gameEngine.ts`:

1. `broadcastGameStart()` emits `game_started` + first question
2. `goToNextQuestion()` increments the question index
3. **10 seconds** — players see the question and answer
4. `show_mid_round_leaderboard` emitted with current scores
5. **5 seconds** — leaderboard displayed
6. Loop back to step 2 until all questions are exhausted
7. Game ends → results persisted → clients notified

### Answer Scoring

- Correct answer: **+10 points** (via Redis sorted set `ZINCRBY`)
- Wrong / no answer: 0 points
- Duplicate submissions rejected (per-question tracking in Redis)

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.5+
- [Docker](https://docker.com) (for Valkey/Redis)
- A [Groq](https://groq.com) API key (for AI question generation)
- A [Firebase](https://firebase.google.com) project (for authentication)
- A [Neon](https://neon.tech) PostgreSQL database (or any Postgres)

### Installation

```bash
# Clone the repo
git clone <repo-url> && cd game

# Install backend dependencies
bun install

# Install frontend dependencies
cd client && bun install && cd ..

# Copy environment files
cp .env.example .env        # Backend env
cp client/.env.example client/.env  # Frontend env
```

### Environment Variables

**Backend (`.env`)**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon/Postgres connection string |
| `REDIS_URL` | Redis/Valkey connection string |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |
| `GROQ_API_KEY` | Groq API key for AI generation |
| `PORT` | Server port (default: 3000) |
| `FRONTEND_URL` | Allowed CORS origin |

**Frontend (`client/.env`)**

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_API_BASE_URL` | Backend URL (default: `http://localhost:3000`) |

### Running Locally

```bash
# Start Redis/Valkey via Docker
docker run -p 6379:6379 valkey/valkey

# Start the backend (in one terminal)
bun run dev

# Start the frontend (in another terminal)
cd client && bun run dev
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173`.

---

## Project Structure

```
game/
├── src/                          # Backend source
│   ├── server.ts                 # Entry point (Express + Socket.IO)
│   ├── config/
│   │   ├── db.ts                 # Postgres connection
│   │   ├── firebaseAdmin.ts      # Firebase Admin init
│   │   └── redis.ts              # Redis client
│   ├── controllers/
│   │   ├── auth.controller.ts    # Google session, refresh, signout
│   │   ├── history.controller.ts # Match history queries
│   │   └── room.controller.ts    # Room/game REST handlers
│   ├── middlewares/
│   │   └── auth.middleware.ts    # Firebase token verification
│   ├── routes/
│   │   ├── auth.routes.ts        # Auth & history routes
│   │   └── room.routes.ts        # Room/game routes
│   ├── services/
│   │   ├── room.service.ts       # Core game logic (create, join, start, answer, etc.)
│   │   ├── gemini.service.ts     # AI question generation (Groq)
│   │   ├── persistence.service.ts# Background Postgres writes
│   │   ├── countdown.service.ts  # TDM countdown scheduler
│   │   ├── roomTtl.ts            # Redis TTL management
│   │   └── lobbyNotify.ts        # Post-leave cleanup
│   ├── utils/
│   │   ├── gameEngine.ts         # 10-second question loop
│   │   └── gameBroadcast.ts      # Game start broadcast
│   └── websockets/
│       └── socket.ts             # Socket.IO event handlers
├── client/                       # Frontend source
│   └── src/
│       ├── main.tsx              # React entry
│       ├── App.tsx               # Router setup
│       ├── GameApp.tsx           # Main game state hub
│       ├── socket.ts             # Socket.IO client singleton
│       ├── firebase/             # Firebase auth client
│       ├── components/
│       │   ├── Landing.tsx       # Marketing page
│       │   ├── AuthPortal.tsx    # Google sign-in
│       │   ├── Lobby.tsx         # Waiting room
│       │   ├── LobbyChat.tsx     # Chat + emoji reactions
│       │   ├── Quiz.tsx          # Question display + answers
│       │   ├── Leaderboard.tsx   # Mid-round scores
│       │   ├── Result.tsx        # Game over screen
│       │   └── MatchReplayModal.tsx  # Quiz replay
│       └── types/                # TypeScript types
├── sql/
│   └── schema.sql                # PostgreSQL schema
├── docs/
│   └── features.md               # Future roadmap
├── docker-compose.yml            # Valkey + backend
├── Dockerfile                    # Multi-stage build
└── .env                          # Backend environment
```

---

## API Overview

### REST Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/rooms/create` | ✓ | Create a room (`gameMode`: `ffa`/`tdm`) |
| POST | `/rooms/join/:roomId` | — | Join a room |
| GET | `/rooms/:roomId` | — | Get room state |
| POST | `/rooms/:roomId/leave` | — | Leave a room |
| POST | `/rooms/:roomId/generate-test` | ✓ | Generate AI questions |
| POST | `/rooms/:roomId/start` | ✓ | Start FFA game |
| POST | `/rooms/:roomId/answer` | — | Submit an answer |
| POST | `/rooms/:roomId/restart` | ✓ | Reset room to lobby |
| POST | `/rooms/:roomId/team` | — | Pick a team |
| POST | `/rooms/:roomId/start-countdown` | ✓ | Start TDM countdown |
| GET | `/auth/me/matches` | ✓ | Match history |

### WebSocket Events

**Server → Client:** `game_started`, `new_question`, `show_mid_round_leaderboard`, `leaderboard_update`, `answer_update`, `game_ended`, `player_joined`, `player_left`, `countdown_started`, `teams_updated`, `receive_message`

**Client → Server:** `join_room`, `leave_room`, `send_message`, `disconnect`

---

## Deployment

### Docker

```bash
docker-compose up --build
```

This starts Valkey (Redis-compatible) and the backend. For production, set `DATABASE_URL` to your Neon Postgres instance and configure `FRONTEND_URL` for CORS.

### Frontend (Vercel)

The frontend auto-deploys from the `client/` directory. See `client/vercel.json` for SPA rewrites.

---

## Redis Key Schema

| Key | Type | Purpose |
|---|---|---|
| `room:{id}` | Hash | Room metadata (mode, status, host, topic) |
| `room:{id}:players` | Set | Player IDs |
| `room:{id}:avatars` | Hash | Player → avatar URL |
| `room:{id}:questions` | String | JSON array of questions |
| `room:{id}:game` | Hash | Game state (currentQuestionIndex, status) |
| `room:{id}:leaderboard` | Sorted Set | Player → score |
| `room:{id}:answers` | Hash | `{userId}:{questionIdx}` → selected option |
| `room:{id}:team_assign` | Hash | Player → team (`a`/`b`) |

All keys have a **24-hour TTL**, refreshed on every mutation.

---

## Roadmap

See [`docs/features.md`](docs/features.md) for the full future roadmap, including mobile support, elimination mode, power-ups, global leaderboards, PWA support, and more.

---

## License

MIT
