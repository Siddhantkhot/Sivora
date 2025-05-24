const express = require('express');
const { register, login, getUserProfile, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.post('/logout', protect, logout);

module.exports = router;
