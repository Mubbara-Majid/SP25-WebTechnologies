const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const isAuthenticated = require('../middleware/isAuthenticated');

// 🏠 Homepage - show 6 products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().limit(6);
    res.render('pages/index', { page: 'index', products });
  } catch (err) {
    console.error(err);
    res.send('Error loading homepage products.');
  }
});

// 🛍 All Products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.render('pages/products', { page: 'products', products, category: 'All' });
  } catch (err) {
    console.error(err);
    res.send('Error loading products.');
  }
});

// 🛍 Category-based Products
router.get('/products/:category', async (req, res) => {
  const category = req.params.category;
  try {
    const products = await Product.find({ category });
    res.render('pages/products', { page: 'products', products, category });
  } catch (err) {
    console.error(err);
    res.send('Error loading products.');
  }
});

// 🔐 Login Page
router.get('/login', (req, res) => {
  res.render('pages/login', { page: 'login' });
});

// 🔐 Login Handler
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.send('Invalid email or password.');
    }

    req.session.user = { name: user.name, email: user.email };
    req.session.message = 'Login successful!';
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Login failed. Please try again.');
  }
});

// 🔐 Register Page
router.get('/register', (req, res) => {
  res.render('pages/register', { page: 'register' });
});

// 🔐 Register Handler
router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || password !== confirmPassword) {
    return res.send('Validation failed. Please try again.');
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('Email already registered. Try logging in.');
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    req.session.user = { name, email };
    req.session.message = 'Registration successful!';
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Server error while registering.');
  }
});

// 🔓 Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// 🛒 Cart Page
router.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  let total = 0;

  cart.forEach(item => {
    total += item.product.price * item.quantity;
  });

  res.render('pages/cart', { page: 'cart', cart, total });
});

// 🛒 Add to Cart Handler
router.post('/cart/add', async (req, res) => {
  const productId = req.body.productId;
  const quantity = parseInt(req.body.quantity || 1);

  try {
    const product = await Product.findById(productId);
    if (!product) return res.send('Product not found');

    if (!req.session.cart) req.session.cart = [];

    const existingItem = req.session.cart.find(item => item.product._id.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      req.session.cart.push({ product, quantity });
    }

    req.session.message = `${product.name} added to cart!`;
    res.redirect(req.get('referer'));
  } catch (err) {
    console.error(err);
    res.send('Error adding to cart');
  }
});

// 🧾 Checkout Page (Protected)
router.get('/checkout', isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  let total = 0;

  cart.forEach(item => {
    total += item.product.price * item.quantity;
  });

  res.render('pages/checkout', {
    page: 'checkout',
    cart,
    total
  });
});

// 🧾 Checkout Handler
router.post('/checkout', isAuthenticated, async (req, res) => {
  const { name, phone, address } = req.body;
  const cart = req.session.cart || [];
  let total = 0;

  cart.forEach(item => {
    total += item.product.price * item.quantity;
  });

  if (cart.length === 0) {
    req.session.message = 'Your cart is empty!';
    return res.redirect('/cart');
  }

  try {
    await Order.create({
      name,
      email: req.session.user.email,
      phone,
      address,
      items: cart,
      total,
      status: 'Pending'
    });

    req.session.cart = [];
    req.session.message = '✅ Order placed successfully! We’ll contact you soon.';
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('❌ Failed to place order. Please try again.');
  }
});

// 📦 My Orders (Protected)
router.get('/my-orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ email: req.session.user.email }).sort({ createdAt: -1 });
    res.render('pages/my-orders', { page: 'my-orders', orders });
  } catch (err) {
    console.error(err);
    res.send('Error fetching your orders.');
  }
});

module.exports = router;
