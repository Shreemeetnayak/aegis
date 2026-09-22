const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    github: !!process.env.GITHUB_TOKEN,
    ai: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)
  });
});

module.exports = router;
