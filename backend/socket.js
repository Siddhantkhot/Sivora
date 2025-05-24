// Re-export the socket handler and io instance from the socket directory
const { socketHandler, getIO, io } = require('./socket/index');

module.exports = { socketHandler, getIO, io };
