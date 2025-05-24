const Message = require('../models/message.model');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');

/**
 * @desc    Get all messages for a chat
 * @route   GET /api/messages/:chatId
 * @access  Private
 */
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Find all messages for the chat
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username profilePicture email')
      .populate('readBy', 'username profilePicture')
      .populate('chat');
    
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Send a new message
 * @route   POST /api/messages
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const { content, chatId, fileUrl, fileType, fileName } = req.body;
    
    if ((!content && !fileUrl) || !chatId) {
      return res.status(400).json({ message: 'Please provide message content and chat ID' });
    }
    
    // Create new message
    const newMessage = {
      sender: req.user._id,
      content: content || '',
      chat: chatId,
      fileUrl: fileUrl || null,
      fileType: fileType || null,
      fileName: fileName || null,
      readBy: [req.user._id] // Mark as read by sender
    };
    
    let message = await Message.create(newMessage);
    
    // Populate message details
    message = await message.populate('sender', 'username profilePicture');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'username profilePicture email'
    });
    
    // Update latest message in chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
    
    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/messages/read
 * @access  Private
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    
    // Find all unread messages in the chat
    const messages = await Message.find({
      chat: chatId,
      readBy: { $ne: req.user._id }
    });
    
    if (messages.length === 0) {
      return res.status(200).json({ message: 'No unread messages' });
    }
    
    // Mark all messages as read
    const updatePromises = messages.map(message => 
      Message.findByIdAndUpdate(
        message._id,
        { $addToSet: { readBy: req.user._id } },
        { new: true }
      )
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Messages marked as read', count: messages.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Upload file for message
 * @route   POST /api/messages/upload
 * @access  Private
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Create file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    // Determine file type
    let fileType = 'document';
    if (req.file.mimetype.startsWith('image')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('audio')) {
      fileType = 'audio';
    }
    
    res.json({
      fileUrl,
      fileType,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete a message
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Note: We're allowing any user to delete any message in the chat
    // This is to support the 'Clear All Messages' functionality
    // In a production app, you might want to add more checks here
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    
    // If this was the latest message in the chat, update the latest message
    const chat = await Chat.findById(message.chat);
    if (chat.latestMessage && chat.latestMessage.toString() === messageId) {
      // Find the new latest message
      const latestMessage = await Message.findOne({ chat: chat._id })
        .sort({ createdAt: -1 });
      
      // Update the chat with the new latest message or null if no messages left
      await Chat.findByIdAndUpdate(chat._id, { 
        latestMessage: latestMessage ? latestMessage._id : null 
      });
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  uploadFile,
  deleteMessage
};
