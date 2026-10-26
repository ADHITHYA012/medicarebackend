const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

// Serve Static Frontend
app.use(express.static(__dirname));

// MongoDB Atlas Connection
const MONGO_URI = "mongodb+srv://jashwanth2116_db_user:jashwanth2116@cluster0.rmoczf2.mongodb.net/medicareDB?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully!'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
    email: { type: String, required: true },
    doctorName: { type: String, required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    tokenNumber: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// 1. REGISTER ROUTE (Any Public Email Allowed)
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required!" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered. Please login!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Registration failed. Try again." });
    }
});

// 2. LOGIN ROUTE
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found. Please register!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid email or password!" });
        }

        res.json({ success: true, message: "Login successful!", email: user.email });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// 3. APPOINTMENT BOOKING ROUTE (FIXED)
app.post('/api/book', async (req, res) => {
    try {
        const { email, doctorName, date, timeSlot } = req.body;

        if (!email || !doctorName || !date || !timeSlot) {
            return res.status(400).json({ success: false, message: "All booking details are required!" });
        }

        // Calculate Next Token Number for the Doctor on that Date
        const totalBookings = await Booking.countDocuments({ doctorName, date });
        const newTokenNumber = totalBookings + 1;

        const booking = new Booking({
            email,
            doctorName,
            date,
            timeSlot,
            tokenNumber: newTokenNumber
        });

        await booking.save();
        res.status(201).json({ 
            success: true, 
            message: "Appointment booked successfully!", 
            tokenNumber: newTokenNumber 
        });
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ success: false, message: "Booking failed due to server error." });
    }
});

// 4. LIVE QUEUE STATUS ROUTE
app.get('/api/queue-status', async (req, res) => {
    try {
        const { doctorName, date } = req.query;
        const bookings = await Booking.find({ doctorName, date }).sort({ createdAt: 1 });

        res.json({
            success: true,
            totalInQueue: bookings.length,
            currentToken: bookings.length > 0 ? 1 : 0,
            queueList: bookings
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Queue fetch error" });
    }
});

// Default Route
app.get('/', (req, res) => {
    res.send("Medicare Backend Server is Running!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
