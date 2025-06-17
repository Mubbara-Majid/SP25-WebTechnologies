const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/order');

// 🔐 In-memory user storage (temporary)
const users = [];

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

// 🛍 Category-based products
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

// 🔐 Login Form Handler
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return res.send('Invalid email or password.');

  req.session.user = { name: user.name, email: user.email };
  res.redirect('/');
});

// 🔐 Register Page
router.get('/register', (req, res) => {
  res.render('pages/register', { page: 'register' });
});

// 🔐 Register Handler
router.post('/register', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || password !== confirmPassword) {
    return res.send('Validation failed. Please try again.');
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) return res.send('Email already registered. Try logging in.');

  users.push({ name, email, password });
  req.session.user = { name, email };
  res.redirect('/');
});

// 🔐 Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
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

    // ✅ Flash message
    req.session.message = `${product.name} added to cart!`;

    // ✅ Stay on same page
    res.redirect(req.get('referer'));
  } catch (err) {
    console.error(err);
    res.send('Error adding to cart');
  }
});

// 🧾 Checkout Page (form setup in next step)
router.get('/checkout', (req, res) => {
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

router.post('/checkout', async (req, res) => {
  const { name, email, phone, address } = req.body;
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
      email,
      phone,
      address,
      items: cart,
      total,
      status: 'Pending'
    });
    console.log("📦 Placing order with:", {
              name, phone, address, items: cart, total
            });

    // Clear cart
    req.session.cart = [];

    // Flash success message
    req.session.message = '✅ Order placed successfully! We’ll contact you soon.';

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('❌ Failed to place order. Please try again.');
  }
});

module.exports = router;
