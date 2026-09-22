const express = require('express');
const { createAnalyzeController } = require('../controllers/analyzeController');

function createAnalyzeRouter(dependencies) {
  const router = express.Router();
  const controller = createAnalyzeController(dependencies);

  router.post('/', controller.analyze);
  router.post('/stream', controller.stream);
  router.get('/:owner/:repo', controller.analyzeFromParams);
  return router;
}

module.exports = createAnalyzeRouter;
