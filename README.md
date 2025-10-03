# MERN Realtime Word Game

A realtime multiplayer word game built with MongoDB, Express, React (Vite), Node.js, and Socket.IO.

## Features
- JWT auth (signup/login)
- Lobby to create or join rooms
- Group word input per room
- Draggable tiles board
- Realtime updates (drag/drop, scores)
- Server validation and scoring
- MongoDB persistence and leaderboard

## Monorepo layout
- backend/ — Express + Socket.IO + Mongoose
- frontend/ — Vite + React app

## Local development
Prereqs: Node 18+, MongoDB running locally (or a connection string).

1. Backend
   - Copy env and update if needed
     - PORT=5000
     - MONGO_URI=mongodb://127.0.0.1:27017/wordgame
     - JWT_SECRET=dev_secret (replace for prod)
     - CORS_ORIGIN=http://localhost:5173,http://localhost:5174
   - Install and start
     - cd backend
     - npm install
     - npm run dev

2. Frontend
   - Ensure env points to backend
     - frontend/.env.local
       - VITE_API_BASE=http://localhost:5000
       - VITE_SOCKET_URL=http://localhost:5000
   - Install and start
     - cd frontend
     - npm install
     - npm run dev
   - App opens at http://localhost:5173 or http://localhost:5174

## Socket events
- join_room: { roomCode, user }
- word_input: { roomCode, words }
- drag: { roomCode, tileId, x, y }
- drop: { roomCode, word, userId }
- score_update: { scores }
- room_state: { type, ... }

## Deployment
- Backend (Render/Heroku): set env vars PORT, MONGO_URI, JWT_SECRET, CORS_ORIGIN
- Frontend (Vercel/Netlify): set VITE_API_BASE, VITE_SOCKET_URL to backend URL
- Make sure Socket.IO uses the same origin and supports WebSocket

## Notes
- Validation is simple: word must be in room words; scoring by length
- Enhancements: throttling, animations, ghost tiles, reconnection, auth checks on sockets
