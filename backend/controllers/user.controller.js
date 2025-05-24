const User = require('../models/user.model');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { username: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } }
          ]
        }
      : {};

    // Find all users except the current user
    const users = await User.find({
      ...keyword,
      _id: { $ne: req.user._id }
    }).select('-password');

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    console.log('Profile update request received');
    console.log('User ID from token:', req.user._id);
    
    const user = await User.findById(req.user._id);
    
    if (user) {
      console.log('Found user:', user.username);
      
      // Update user fields if provided in request
      if (req.body.username) user.username = req.body.username;
      if (req.body.email) user.email = req.body.email;
      
      // Handle profile picture (base64 data)
      if (req.body.profilePicture) {
        // Check if it's a base64 string (starts with data:image)
        if (req.body.profilePicture.startsWith('data:image')) {
          console.log('Storing base64 profile picture in database');
          user.profilePicture = req.body.profilePicture;
        } else {
          // If it's a URL, store it as is
          user.profilePicture = req.body.profilePicture;
        }
      }
      
      // If password is included in the request, update it
      if (req.body.password && req.body.password.trim() !== '') {
        user.password = req.body.password;
      }
      
      console.log('Saving updated user data');
      const updatedUser = await user.save();
      
      const responseData = {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        status: updatedUser.status
      };
      
      console.log('Profile updated successfully');
      res.json(responseData);
    } else {
      console.error('User not found for ID:', req.user._id);
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update user status
 * @route   PUT /api/users/status
 * @access  Private
 */
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.status = status;
      user.lastSeen = Date.now();
      
      const updatedUser = await user.save();
      
      res.json({
        _id: updatedUser._id,
        status: updatedUser.status,
        lastSeen: updatedUser.lastSeen
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserProfile,
  updateUserStatus
};
