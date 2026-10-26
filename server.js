const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

app.use(express.json());
app.use(cors());

// ===============================
// MongoDB Connection
// ===============================

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI is not configured.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ===============================
// User Schema
// ===============================

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
});

const User = mongoose.model('User', userSchema);

// ===============================
// Booking Schema
// ===============================

const bookingSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  doctorName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  tokenNumber: {
    type: Number,
    required: true
  }
});

const Booking = mongoose.model('Booking', bookingSchema);

// ===============================
// Root Route
// ===============================

app.get('/', (req, res) => {
  res.send('Medicare Backend Server is Running!');
});

// ===============================
// Register API
// ===============================

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid email and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login!'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email: cleanEmail,
      password: hashedPassword
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Registration Successful!'
    });

  } catch (err) {
    console.error('Register Error:', err.message);

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login!'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error during registration.'
    });
  }
});

// ===============================
// Login API
// ===============================

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    return res.json({
      success: true,
      email: user.email,
      message: 'Login successful!'
    });

  } catch (err) {
    console.error('Login Error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

// ===============================
// Book Appointment API
// ===============================

app.post('/api/book', async (req, res) => {
  try {
    const { email, doctorName, date, timeSlot } = req.body;

    if (
      typeof email !== 'string' ||
      typeof doctorName !== 'string' ||
      typeof date !== 'string' ||
      typeof timeSlot !== 'string' ||
      !email.trim() ||
      !doctorName.trim() ||
      !date.trim() ||
      !timeSlot.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'All booking fields are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanDoctor = doctorName.trim();

    const count = await Booking.countDocuments({
      doctorName: cleanDoctor,
      date: date.trim()
    });

    const tokenNumber = count + 1;

    const newBooking = new Booking({
      email: cleanEmail,
      doctorName: cleanDoctor,
      date: date.trim(),
      timeSlot: timeSlot.trim(),
      tokenNumber
    });

    await newBooking.save();

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      tokenNumber
    });

  } catch (err) {
    console.error('Booking Error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Booking failed.'
    });
  }
});

// ===============================
// Queue Status API
// ===============================

app.get('/api/queue-status', async (req, res) => {
  try {
    const { doctorName, date } = req.query;

    if (
      typeof doctorName !== 'string' ||
      typeof date !== 'string' ||
      !doctorName.trim() ||
      !date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Doctor name and date are required.'
      });
    }

    const bookings = await Booking.find({
      doctorName: doctorName.trim(),
      date: date.trim()
    }).sort({ tokenNumber: 1 });

    return res.json({
      success: true,
      currentToken: bookings.length > 0
        ? bookings[0].tokenNumber
        : 0,
      totalBookings: bookings.length
    });

  } catch (err) {
    console.error('Queue Error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching queue.'
    });
  }
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

