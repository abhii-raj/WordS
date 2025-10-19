const express = require('express');
const auth = require('../middleware/auth');
const Room = require('../models/Room');

const router = express.Router();

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

router.post('/', auth(true), async (req, res) => {
  const userId = req.user.id;
  let code = randomCode();

  // keep generating a code  until a unused code is found 
  while (await Room.findOne({ code })) code = randomCode();
  const now = new Date();
  const phaseEnd = new Date(now.getTime() + 15 * 1000);
  const room = await Room.create({ code, host: userId, players: [userId], words: [], playerSubmissions: [], phase: 'lobby' , phaseEnd: phaseEnd });
  res.json(room);
});

router.post('/:code/join', auth(true), async (req, res) => {
  const { code } = req.params;
  const room = await Room.findOne({ code });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!room.players.some((p) => p.toString() === req.user.id)) {
    room.players.push(req.user.id);
    await room.save();
  }
  res.json(room);
});

router.post('/:code/words', auth(true), async (req, res) => {
  const { code } = req.params;
  const { words } = req.body;
  const room = await Room.findOne({ code });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.phase !== 'lobby' && room.phase !== 'entry') return res.status(400).json({ error: 'Game already started' });
  room.words = Array.isArray(words)
    ? words.map((w) => String(w).trim()).filter(Boolean)
    : [];
  await room.save();
  res.json(room);
});



router.post('/:code/finalize', async (req, res) => {
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
 

router.get('/:code', auth(false), async (req, res) => {
  const { code } = req.params;
  const room = await Room.findOne({ code }).populate('players', 'username');
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({
    ...room.toObject(),
    
  });
});

module.exports = router;
