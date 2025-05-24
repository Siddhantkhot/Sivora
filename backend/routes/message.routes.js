const express = require('express');
const multer = require('multer');
const path = require('path');
const { 
  getMessages, 
  sendMessage, 
  markMessagesAsRead,
  uploadFile,
  deleteMessage
} = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/wav'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and audio files are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
  .post(sendMessage);

router.route('/read')
  .put(markMessagesAsRead);

router.route('/upload')
  .post(upload.single('file'), uploadFile);

// Get messages for a chat
router.route('/chat/:chatId')
  .get(getMessages);

// Delete a specific message
router.route('/delete/:messageId')
  .delete(deleteMessage);

module.exports = router;
