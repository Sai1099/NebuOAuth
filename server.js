const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();

// Connect to MongoDB (replace with your MongoDB connection string)
mongoose.connect('mongodb+srv://sai:nebulabhai@cluster0.l9c5xyp.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

// Define User Schema
const User = mongoose.model('User', {
  username: String,
  email: String,
  role: String,
});

// Passport setup
passport.use(new GoogleStrategy({
  clientID: '772787922-4une922l7nn5vpdsucq5fj6r9l1m8j5j.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: 'http://localhost:3000/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;

  // Determine user role based on email
  const role = isUserAdmin(email) ? 'admin' : 'user';

  // Check if the user is already in the database
  // Check if the user is already in the database
User.findOne({ email: email })
.then(user => {
  if (!user) {
    // If the user is not in the database, create a new user
    const newUser = new User({
      username: profile.displayName,
      email: email,
      role: role,
    });

    return newUser.save();
  } else {
    // If the user is already in the database, return the user
    return user;
  }
})
.then(user => {
  return done(null, user);
})
.catch(err => {
  return done(err);
});
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});
// Express session middleware
app.use(session({ secret: '032577272fdc02f1a54465049bb03375bf860acaa4f1166226023b4ca23e9c21', resave: true, saveUninitialized: true }));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.send('<h1>Welcome to OAuth Example</h1>');
});

app.get('/login', (req, res) => {
  res.send('<h1>Login Page</h1><a href="/auth/google">Login with Google</a>');
});

app.get('/signup', (req, res) => {
  res.send('<h1>Signup Page</h1><a href="/auth/google">Signup with Google</a>');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);


app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to the appropriate page
    const redirectPage = req.user.role === 'admin' ? '/admin' : '/user';
    res.redirect(redirectPage);
  }
);

app.get('/login', (req, res) => {
  // Redirect to admin or user page based on user role
  const redirectPage = req.user.role === 'admin' ? '/admin' : '/user';
  res.send(`<h1>Welcome ${req.user.role}: ${req.user.username}</h1><a href="/logout">Logout</a>`);
});

app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  res.send(`<h1>Welcome Admin: ${req.user.username}</h1><a href="/logout">Logout</a>`);
});

app.get('/user', isAuthenticated, (req, res) => {
  res.send(`<h1>Welcome User: ${req.user.username}</h1><a href="/logout">Logout</a>`);
});

app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return res.send('Error during logout');
    }
    res.redirect('/');
  });
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }
  res.redirect('/');
}
// Function to determine if the user is an admin based on email
function isUserAdmin(email) {
  // List of Gmail addresses designated as admin accounts
  const adminEmails = ['admin1@gmail.com', 'admin2@gmail.com'];

  return adminEmails.includes(email);
}

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
