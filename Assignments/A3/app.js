const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

// 1. Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 2. View engine setup
app.set('view engine', 'ejs');
app.use(expressLayouts);

// 3. Session setup
app.use(session({
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: false
}));

// ✅ 4. Make session available in all EJS views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// 5. Route setup
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// 6. Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SweatyBetty Express app running on http://localhost:${PORT}`);
});
