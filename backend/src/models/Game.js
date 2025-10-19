const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    scores: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String }, // a duplicacy can populate user to get username 
        score: { type: Number, default: 0 },
      },
    ],
    moves: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        word: String,
        valid: Boolean,
        points: Number,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  // explain 
  { timestamps: true }
);

module.exports = mongoose.model('Game', gameSchema);
