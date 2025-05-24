const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const { io } = require('../socket');

// Get the io instance
const getIo = () => {
  if (typeof io === 'function') {
    return io();
  }
  return io;
};

/**
 * @desc    Create or access a one-on-one chat
 * @route   POST /api/chats
 * @access  Private
 */
const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'UserId param not sent with request' });
    }

    // Check if chat exists between the two users
    let chat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } }
      ]
    })
      .populate('users', '-password')
      .populate('latestMessage');

    // Populate the sender details in the latest message
    chat = await User.populate(chat, {
      path: 'latestMessage.sender',
      select: 'username profilePicture email'
    });

    if (chat.length > 0) {
      res.json(chat[0]);
    } else {
      // Create a new chat if it doesn't exist
      const chatData = {
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId]
      };

      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findById(createdChat._id).populate('users', '-password');
      
      // Emit socket event for new chat
      const ioInstance = getIo();
      if (ioInstance) {
        ioInstance.to(userId.toString()).emit('new chat', fullChat);
        ioInstance.to(req.user._id.toString()).emit('new chat', fullChat);
      } else {
        console.warn('Socket.io instance not available for emitting new chat event');
      }
      
      res.status(201).json(fullChat);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all chats for a user
 * @route   GET /api/chats
 * @access  Private
 */
const getChats = async (req, res) => {
  try {
    // Find all chats that the user is part of
    let chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } }
    })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    // Populate the sender details in the latest message
    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'username profilePicture email'
    });

    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Create a new group chat
 * @route   POST /api/chats/group
 * @access  Private
 */
const createGroupChat = async (req, res) => {
  try {
    const { users, name, groupPicture } = req.body;

    if (!users || !name) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Parse users if it's a string
    let userArray = users;
    if (typeof users === 'string') {
      userArray = JSON.parse(users);
    }

    // Check if there are at least 2 users
    if (userArray.length < 2) {
      return res.status(400).json({ message: 'More than 2 users are required to form a group chat' });
    }

    // Add current user to the group
    userArray.push(req.user._id);

    // Create the group chat
    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: userArray,
      groupAdmin: req.user._id,
      groupPicture: groupPicture || undefined
    });

    // Get full details of the group chat
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    // Emit socket event for new group chat to all users in the group
    userArray.forEach(userId => {
      io.to(userId.toString()).emit('new chat', fullGroupChat);
    });

    res.status(201).json(fullGroupChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Rename a group chat
 * @route   PUT /api/chats/group/:id
 * @access  Private
 */
const renameGroupChat = async (req, res) => {
  try {
    const { chatId, chatName, groupPicture } = req.body;

    // Update the chat
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        chatName: chatName,
        ...(groupPicture && { groupPicture })
      },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(updatedChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Add a user to a group chat
 * @route   PUT /api/chats/group/add
 * @access  Private
 */
const addToGroupChat = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    // Check if the user making the request is the admin
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can add users to the group' });
    }

    // Add user to the group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(updatedChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Remove a user from a group chat
 * @route   PUT /api/chats/group/remove
 * @access  Private
 */
const removeFromGroupChat = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    // Check if the user making the request is the admin
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can remove users from the group' });
    }

    // Remove user from the group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(updatedChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  accessChat,
  getChats,
  createGroupChat,
  renameGroupChat,
  addToGroupChat,
  removeFromGroupChat
};
