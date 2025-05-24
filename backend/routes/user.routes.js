const express = require('express');
const { getUsers, getUserById, updateUserProfile, updateUserStatus } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
  .get(getUsers);

router.route('/profile')
  .put(updateUserProfile);

router.route('/status')
  .put(updateUserStatus);

router.route('/:id')
  .get(getUserById);

module.exports = router;
