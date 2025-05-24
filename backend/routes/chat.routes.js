const express = require('express');
const { 
  accessChat, 
  getChats, 
  createGroupChat, 
  renameGroupChat, 
  addToGroupChat, 
  removeFromGroupChat 
} = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
  .post(accessChat)
  .get(getChats);

router.route('/group')
  .post(createGroupChat);

router.route('/group/rename')
  .put(renameGroupChat);

router.route('/group/add')
  .put(addToGroupChat);

router.route('/group/remove')
  .put(removeFromGroupChat);

module.exports = router;
