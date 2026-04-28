const Vote = require('../models/Vote');
const NewsItem = require('../models/NewsItem');
const { aggregateItem } = require('./aggregationService');

let io = null;

function initSocket(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join item room for real-time updates
    socket.on('subscribe:item', (itemId) => {
      socket.join(`item:${itemId}`);
      console.log(`User ${socket.id} subscribed to item ${itemId}`);
    });

    socket.on('unsubscribe:item', (itemId) => {
      socket.leave(`item:${itemId}`);
    });

    // Join feed room for new items
    socket.on('subscribe:feed', () => {
      socket.join('feed');
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
}

async function broadcastVoteUpdate(itemId) {
  if (!io) return;

  const { T, F, U, S, P, U_r, C } = await aggregateItem(itemId);
  const item = await NewsItem.findById(itemId);

  io.to(`item:${itemId}`).emit('vote:updated', {
    itemId,
    T,
    F,
    U,
    S,
    P,
    U_r,
    C,
    updatedAt: new Date(),
  });
}

async function broadcastNewItem(item) {
  if (!io) return;

  io.to('feed').emit('item:new', {
    id: item._id,
    title: item.title,
    description: item.description,
    status: item.status,
    createdAt: item.createdAt,
  });
}

async function broadcastClassification(itemId, classification, credScore) {
  if (!io) return;

  io.to(`item:${itemId}`).emit('item:classified', {
    itemId,
    classification,
    credibilityScore: credScore,
    status: 'classified',
  });
}

module.exports = {
  initSocket,
  broadcastVoteUpdate,
  broadcastNewItem,
  broadcastClassification,
};
