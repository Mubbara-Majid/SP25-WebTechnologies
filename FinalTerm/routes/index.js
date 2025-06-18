const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const isAuthenticated = require('../middleware/isAuthenticated');
const isAdmin = require('../middleware/isAdmin');
const Complaint = require('../models/Complaints');

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

    // ✅ Include isAdmin in session
    req.session.user = {
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false
    };

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

    const newUser = new User({
      name,
      email,
      password,
      isAdmin: email === 'mmubbara@gmail.com' // ✅ Make admin based on email
    });

    await newUser.save();

    // ✅ Fix: use newUser, not undefined 'user'
    req.session.user = {
      name: newUser.name,
      email: newUser.email,
      isAdmin: newUser.isAdmin
    };

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

// 🛠️ Admin: View All Products
router.get('/admin/products', isAdmin, async (req, res) => {
  const products = await Product.find();
  res.render('admin/products', { page: 'admin-products', products });
});

// 🛠️ Admin: View All Orders
router.get('/admin/orders', isAdmin, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.render('admin/orders', { page: 'admin-orders', orders });
});

// Show “Add Product” form
router.get('/admin/products/add', isAdmin, (req, res) => {
  res.render('admin/add-product', { page: 'admin-add-product' });
});

// Handle the form submission
router.post('/admin/products/add', isAdmin, async (req, res) => {
  const { name, price, category, image, description } = req.body;
  try {
    await Product.create({ name, price, category, image, description });
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.send('Failed to add product.');
  }
});

// Show Edit Product Form
router.get('/admin/products/edit/:id', isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.send('Product not found');
    res.render('admin/edit-product', { page: 'admin-edit-product', product });
  } catch (err) {
    console.error(err);
    res.send('Error loading product for editing');
  }
});
// Handle Edit Product Form Submission
router.post('/admin/products/edit/:id', isAdmin, async (req, res) => {
  const { name, price, category, image, description } = req.body;

  try {
    await Product.findByIdAndUpdate(req.params.id, {
      name,
      price,
      category,
      image,
      description
    });

    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.send('Failed to update product.');
  }
});

// Delete Product
router.post('/admin/products/delete/:id', isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.send('Failed to delete product.');
  }
});

// 📝 Contact Us Form Page
router.get('/contact', isAuthenticated, (req, res) => {
  const orderId = req.query.orderId || '';
  res.render('pages/contact', { page: 'contact', orderId });
});


// 📨 Submit Complaint (POST)

router.post('/contact', isAuthenticated, async (req, res) => {
  const { orderId, message } = req.body;

  try {
    await Complaint.create({
      userEmail: req.session.user.email,
      orderId,
      message
    });

    req.session.message = 'Complaint submitted successfully!';
    res.redirect('/my-complaints');
  } catch (err) {
    console.error(err);
    res.send('Failed to submit complaint.');
  }
});

// 👀 User View – View Own Complaints
router.get('/my-complaints', isAuthenticated, async (req, res) => {
  const complaints = await Complaint.find({ userEmail: req.session.user.email }).sort({ createdAt: -1 });
  res.render('pages/my-complaints', { page: 'my-complaints', complaints });
});

//👑 Admin View – All Complaints

router.get('/admin/complaints', isAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    const totalCount = complaints.length;

    res.render('admin/complaints', {
      page: 'admin-complaints',
      complaints,
      totalCount
    });
  } catch (err) {
    console.error(err);
    res.send('Error fetching complaints');
  }
});

module.exports = router;
