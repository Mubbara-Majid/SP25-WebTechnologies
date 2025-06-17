const users = []; // Temporary store: { name, email, password }

const express = require('express');
const router = express.Router();

const productList = [
  { name: "Power Shorts", price: "$190", image: "/images/product1.jpg" },
  { name: "Power Leggings", price: "$300", image: "/images/product2.jpg" },
  { name: "Vest", price: "$200", image: "/images/product3.jpg" }
];

router.get('/', (req, res) => {
  res.render('pages/index', { page: 'index', products: productList });
});
router.get('/login', (req, res) => {
    res.render('pages/login');
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.send('Invalid email or password.');
  }

  req.session.user = { name: user.name, email: user.email };
  res.redirect('/');
});

router.get('/checkout', (req, res) => {
    res.render('pages/checkout');
});

router.get('/register', (req, res) => {
  res.render('pages/register', { page: 'register' });
});

router.post('/register', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || password !== confirmPassword) {
    return res.send('Validation failed. Please try again.');
  }

  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.send('Email already registered. Try logging in.');
  }

  // Store user (in-memory)
  users.push({ name, email, password });

  // Auto-login after register
  req.session.user = { name, email };
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;