const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/home', contentController.getHomeContent);
router.get('/', authenticate, authorize('ADMIN'), contentController.getAllContent);
router.post('/', authenticate, authorize('ADMIN'), contentController.createContent);
router.patch('/:id', authenticate, authorize('ADMIN'), contentController.updateContent);
router.delete('/:id', authenticate, authorize('ADMIN'), contentController.deleteContent);

module.exports = router;
