require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const Room = require('./models/Room');
const Game = require('./models/Game');
const leaderboardRoutes = require('./routes/leaderboard');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const ORIGINS = CORS_ORIGIN.split(',').map((s) => s.trim());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ORIGINS.includes('*') || ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: ORIGINS.includes('*') ? '*' : ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wordgame';
mongoose
  .connect(MONGO_URI, { dbName: undefined })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error', err));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/rooms/:code/finalize', async (req, res) => {
  try {
    const { code } = req.params;
    const room = await Room.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    let game = await Game.findOne({ room: room._id });
    if (!game) return res.status(400).json({ error: 'No game' });
    room.state = 'finished';
    await room.save();
    const topScore = Math.max(0, ...game.scores.map((s) => s.score));
    const winners = game.scores.filter((s) => s.score === topScore).map((s) => s.user);
    for (const s of game.scores) {
      await User.findByIdAndUpdate(s.user, {
        $inc: { points: s.score, wins: winners.some((w) => String(w) === String(s.user)) ? 1 : 0 },
      });
    }
    res.json({ winners, scores: game.scores });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

const activeTimers = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  
  socket.on('join_room', async ({ roomCode, user }) => {
    try {
      if (!roomCode) return;
      let room = await Room.findOne({ code: roomCode }).populate('players', 'username');
      if (!room) return;
      socket.join(roomCode);
      socket.userId = user.id;

      if (room.phase === 'entry') {
        const now = new Date();
        if (!room.phaseEnd || new Date(room.phaseEnd) <= now) {
          room.phaseEnd = new Date(now.getTime() + 15 * 1000);
          await room.save();
          console.log(`[TIMER] Set new phaseEnd for room ${roomCode}: ${room.phaseEnd}`);
        }
        const msLeft = new Date(room.phaseEnd) - now;
        if (msLeft > 0 && !activeTimers.has(roomCode)) {
          const timerId = setTimeout(async () => {
            const r = await Room.findOne({ code: roomCode });
            if (r && r.phase === 'entry') {
              r.phase = 'play';
              await r.save();
              io.to(roomCode).emit('room_state', { type: 'phase', phase: 'play' });
              console.log(`[TIMER] Room ${roomCode} advanced to play phase.`);
            }
            activeTimers.delete(roomCode);
          }, msLeft);
          activeTimers.set(roomCode, timerId);
          console.log(`[TIMER] Timer started for room ${roomCode}, msLeft: ${msLeft}`);
        } else if (msLeft <= 0 && room.phase === 'entry') {
          // Timer already expired, advance immediately
          room.phase = 'play';
          await room.save();
          console.log(`[TIMER EXPIRED] Room ${roomCode} advanced to play phase immediately`);
          io.to(roomCode).emit('room_state', { type: 'phase', phase: 'play' });
        }
      }

      // Send full room state to the joining user
      io.to(socket.id).emit('room_state', {
        type: 'sync',
        phase: room.phase,
        phaseEnd: room.phaseEnd,
        words: room.words,
        players: room.players.map(p => ({ id: p._id, username: p.username })),
        playersReady: room.playersReady || [],
        playerSubmissions: room.playerSubmissions || [],
        playerWords: room.playerWords || [],
        settings: room.settings || { timerDuration: 15, wordsPerPlayer: 3 },
        chatMessages: room.chatMessages || []
      });
      
      // Broadcast updated player list to all users in the room
      io.to(roomCode).emit('room_state', { 
        type: 'player_update', 
        players: room.players.map(p => ({ id: p._id, username: p.username })),
        user, 
        socketId: socket.id 
      });
    } catch (e) {
      console.error('join_room error', e);
    }
  });

  socket.on('start_game', async ({ roomCode, userId }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      
      // Only host can start the game
      if (room.host.toString() !== userId) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }
      
      // Can only start from lobby phase
      if (room.phase !== 'lobby') {
        socket.emit('error', { message: 'Game can only be started from lobby' });
        return;
      }
      
      // All players must be ready
      if (room.playersReady.length !== room.players.length) {
        socket.emit('error', { message: 'All players must be ready before starting' });
        return;
      }
      
      // Start the entry phase with configurable timer
      const now = new Date();
      const timerDuration = room.settings?.timerDuration || 15;
      const phaseEnd = new Date(now.getTime() + timerDuration * 1000);
      room.phase = 'entry';
      room.phaseEnd = phaseEnd;
      await room.save();
      
      console.log(`[GAME STARTED] Room ${roomCode} entered word entry phase`);
      io.to(roomCode).emit('phase_change', { 
        phase: 'entry', 
        phaseEnd: phaseEnd.toISOString(),
        message: 'Game started! Enter your words.'
      });
    } catch (e) {
      console.error('start_game error', e);
    }
  });

  socket.on('chat_message', async ({ roomCode, message, userId }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      
      const user = await User.findById(userId);
      if (!user) return;
      
      // Add message to room
      const chatMessage = {
        user: userId,
        username: user.username,
        message: message.trim(),
        timestamp: new Date()
      };
      
      room.chatMessages.push(chatMessage);
      await room.save();
      
      // Broadcast to all players in the room
      io.to(roomCode).emit('chat_message', chatMessage);
      console.log(`[CHAT] ${user.username} in room ${roomCode}: ${message}`);
    } catch (e) {
      console.error('chat_message error', e);
    }
  });

  socket.on('update_settings', async ({ roomCode, settings, userId }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      
      // Only host can update settings
      if (room.host.toString() !== userId) {
        socket.emit('error', { message: 'Only the host can update settings' });
        return;
      }
      
      // Can only update settings in lobby phase
      if (room.phase !== 'lobby') {
        socket.emit('error', { message: 'Settings can only be updated in lobby' });
        return;
      }
      
      // Validate and update settings
      if (settings.timerDuration) {
        room.settings.timerDuration = Math.max(5, Math.min(30, settings.timerDuration));
      }
      if (settings.wordsPerPlayer) {
        room.settings.wordsPerPlayer = Math.max(3, Math.min(4, settings.wordsPerPlayer));
      }
      
      await room.save();
      
      console.log(`[SETTINGS] Host updated room ${roomCode} settings:`, room.settings);
      io.to(roomCode).emit('settings_updated', { settings: room.settings });
    } catch (e) {
      console.error('update_settings error', e);
    }
  });

  socket.on('toggle_ready', async ({ roomCode, userId }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      
      // Can only toggle ready in lobby phase
      if (room.phase !== 'lobby') {
        socket.emit('error', { message: 'Can only ready up in lobby' });
        return;
      }
      
      // Check if player is in the room
      if (!room.players.some(p => p.toString() === userId)) {
        socket.emit('error', { message: 'You are not in this room' });
        return;
      }
      
      // Toggle ready status
      const isReady = room.playersReady.some(p => p.toString() === userId);
      if (isReady) {
        room.playersReady = room.playersReady.filter(p => p.toString() !== userId);
      } else {
        room.playersReady.push(userId);
      }
      
      await room.save();
      
      const user = await User.findById(userId);
      console.log(`[READY] ${user?.username || 'Player'} is ${isReady ? 'not ready' : 'ready'} in room ${roomCode}`);
      
      // Broadcast ready status to all players
      io.to(roomCode).emit('ready_status_updated', { 
        playersReady: room.playersReady,
        totalPlayers: room.players.length,
        allReady: room.playersReady.length === room.players.length
      });
    } catch (e) {
      console.error('toggle_ready error', e);
    }
  });

  socket.on('check_phase', async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      
      const now = new Date();
      
      // Check if entry phase timer has expired
      if (room.phase === 'entry' && room.phaseEnd && new Date(room.phaseEnd) <= now) {
        room.phase = 'play';
        await room.save();
        console.log(`[PHASE CHECK] Room ${roomCode} advanced to play phase`);
        io.to(roomCode).emit('room_state', { type: 'phase', phase: 'play' });
      }
    } catch (e) {
      console.error('check_phase error', e);
    }
  });

  socket.on('word_input', async ({ roomCode, words, userId, justAdd, submit }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room || room.phase !== 'entry') return;
      
      const playerId = userId || socket.userId;
      if (!playerId) {
        console.error('No userId provided for word_input');
        return;
      }
      
      // Add words if provided
      if (words && words.length > 0) {
        const clean = Array.isArray(words) ? words.map((w) => String(w).trim()).filter(Boolean) : [];
        if (clean.length > 0) {
          // Check current user's word count
          let userWordsIndex = room.playerWords.findIndex(pw => pw.user.toString() === playerId.toString());
          if (userWordsIndex === -1) {
            room.playerWords.push({ user: playerId, words: [] });
            userWordsIndex = room.playerWords.length - 1;
          }
          
          // Get reference to the actual array element
          const userWords = room.playerWords[userWordsIndex];
          
          // Calculate how many words user can still add
          const maxWords = room.settings?.wordsPerPlayer || 3;
          const currentWordCount = userWords.words.length;
          const remainingSlots = maxWords - currentWordCount;
          
          console.log(`[DEBUG] User ${playerId} current word count: ${currentWordCount}/${maxWords}, remaining slots: ${remainingSlots}`);
          
          if (remainingSlots <= 0) {
            console.log(`[WORDS] User ${playerId} has reached word limit (${maxWords}) in room ${roomCode}`);
            return; // Don't add any more words
          }
          
          // Limit new words to remaining slots
          const wordsToAdd = clean.slice(0, remainingSlots);
          userWords.words.push(...wordsToAdd);
          
          // Update global words list
          const all = Array.from(new Set([...(room.words || []), ...wordsToAdd]));
          room.words = all;
          
          // Mark playerWords as modified for Mongoose
          room.markModified('playerWords');
          
          console.log(`[WORDS] User ${playerId} added ${wordsToAdd.length} words in room ${roomCode}:`, wordsToAdd, `(${userWords.words.length}/${maxWords})`);
        }
      }
      
      // Mark player as submitted if this is a submit action
      if (submit && !room.playerSubmissions.some(p => p.toString() === playerId.toString())) {
        room.playerSubmissions.push(playerId);
        console.log(`[SUBMIT] User ${playerId} submitted in room ${roomCode}`);
      }
      
      await room.save();
      io.to(roomCode).emit('room_state', { type: 'words_update', words: room.words, playerSubmissions: room.playerSubmissions, playerWords: room.playerWords });
      
      // Check if all players have submitted and advance to play phase
      if (room.playerSubmissions.length >= room.players.length) {
        if (activeTimers.has(roomCode)) {
          clearTimeout(activeTimers.get(roomCode));
          activeTimers.delete(roomCode);
        }
        
        room.phase = 'play';
        await room.save();
        io.to(roomCode).emit('room_state', { type: 'phase', phase: 'play' });
        console.log(`[SUBMISSIONS] All players submitted in room ${roomCode} (${room.playerSubmissions.length}/${room.players.length}), advancing to play phase.`);
      }
    } catch (e) {
      console.error('word_input error', e);
    }
  });

  socket.on('drag', ({ roomCode, tileId, x, y }) => {
    if (!roomCode || typeof x !== 'number' || typeof y !== 'number') return;
    socket.to(roomCode).emit('drag', { tileId, x, y, from: socket.id });
  });

  socket.on('drop', async ({ roomCode, word, userId, path }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      
      // Enhanced word validation - check both forward and reverse, case insensitive
      const normalizedWord = String(word || '').trim().toLowerCase();
      const reverseWord = normalizedWord.split('').reverse().join('');
      const roomWords = room.words.map(w => w.toLowerCase());
      
      const valid = roomWords.includes(normalizedWord) || roomWords.includes(reverseWord);
      const points = valid ? 1 : 0; // Flat 1 point per word instead of word length

      let game = await Game.findOne({ room: room._id });
      if (!game) game = await Game.create({ room: room._id, scores: [], moves: [] });
      
      // Check if word was already found by this user to prevent duplicate scoring
      const alreadyFound = game.moves.some(move => 
        move.user.toString() === userId.toString() && 
        move.word.toLowerCase() === normalizedWord && 
        move.valid
      );
      
      if (valid && !alreadyFound) {
        const user = await User.findById(userId);
        const entry = game.scores.find((s) => s.user?.toString() === String(userId));
        if (entry) {
          entry.score += points;
        } else {
          game.scores.push({ user: userId, username: user?.username || 'Player', score: points });
        }
        game.moves.push({ user: userId, word: normalizedWord, valid: true, points });
        console.log(`[WORD FOUND] ${user?.username || 'Player'} found "${normalizedWord}" (+${points} points)`);
      } else if (!valid) {
        game.moves.push({ user: userId, word: normalizedWord, valid: false, points: 0 });
        console.log(`[INVALID WORD] ${normalizedWord} not found in word list`);
      } else {
        console.log(`[DUPLICATE] ${normalizedWord} already found by user`);
      }
      
      await game.save();

      io.to(roomCode).emit('drop', { word: normalizedWord, valid: valid && !alreadyFound, points: valid && !alreadyFound ? points : 0, userId, duplicate: alreadyFound, path });
      if (valid && !alreadyFound) {
        io.to(roomCode).emit('score_update', { scores: game.scores });
      }
    } catch (e) {
      console.error('drop error', e);
    }
  });
  
  socket.on('reset_game', async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      
      if (activeTimers.has(roomCode)) {
        clearTimeout(activeTimers.get(roomCode));
        activeTimers.delete(roomCode);
      }
      
      room.phase = 'lobby';
      room.phaseEnd = null;
      room.words = [];
      room.playerWords = [];
      room.playerSubmissions = [];
      room.playersReady = [];
      await room.save();
      await Game.deleteOne({ room: room._id });
      io.to(roomCode).emit('room_state', { type: 'reset', phase: 'lobby', phaseEnd: null, words: [] });

    } catch (e) {
      console.error('reset_game error', e);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected', socket.id, 'reason:', reason);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
