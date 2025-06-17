const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: String, // e.g., 'run', 'yoga', 'casual'
  gender: String,    // e.g., 'women', 'men'
  price: Number,
  image: String,
  description: String
});

module.exports = mongoose.model('Product', productSchema);
