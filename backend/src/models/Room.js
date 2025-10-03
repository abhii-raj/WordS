const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    playersReady: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    words: [{ type: String }],
    playerWords: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      words: [{ type: String }]
    }],
    playerSubmissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    chatMessages: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: { type: String },
      message: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    phase: { type: String, enum: ['lobby', 'entry', 'play', 'finished'], default: 'lobby' },
    phaseEnd: { type: Date },
    settings: {
      timerDuration: { type: Number, default: 15, min: 5, max: 30 }, // seconds
      wordsPerPlayer: { type: Number, default: 3, min: 3, max: 4 } // words per player
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
