const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.get('/', async (req, res) => {
  const top = await User.find().sort({ points: -1, wins: -1 }).limit(20).select('username points wins');
  res.json(top);
});

module.exports = router;
