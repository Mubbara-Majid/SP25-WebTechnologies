const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userEmail: String,     // from session
  orderId: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', complaintSchema);
