const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// UNGA MONGODB ATLAS URL-A INGA PASTE PANRUNGA:
// (Example: "mongodb+srv://username:password@cluster.mongodb.net/medicare?retryWrites=true&w=majority")
// ==========================================
const MONGO_URI = "mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/medicare?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  email: String,
  doctorName: String,
  date: String,
  timeSlot: String,
  tokenNumber: Number
});

const Booking = mongoose.model('Booking', bookingSchema);

// Root Route
app.get('/', (req, res) => {
  res.send('Medicare Backend Server is Running!');
});

// Register Endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and Password required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email: cleanEmail, password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: 'Registration Successful!' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and Password required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found. Please register first!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid Email or Password.' });
    }

    res.json({ success: true, email: user.email, message: 'Login successful!' });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Booking Endpoint
app.post('/api/book', async (req, res) => {
  try {
    const { email, doctorName, date, timeSlot } = req.body;

    const count = await Booking.countDocuments({ doctorName, date });
    const tokenNumber = count + 1;

    const newBooking = new Booking({ email, doctorName, date, timeSlot, tokenNumber });
    await newBooking.save();

    res.json({ success: true, tokenNumber });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
});

// Queue Status Endpoint
app.get('/api/queue-status', async (req, res) => {
  try {
    const { doctorName, date } = req.query;
    const bookings = await Booking.find({ doctorName, date }).sort({ tokenNumber: 1 });
    const currentToken = bookings.length > 0 ? 1 : 0;

    res.json({ success: true, currentToken, totalBookings: bookings.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching queue' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
