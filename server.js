const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

app.use(express.json());
app.use(cors());

// Temporary storage (No Database)
const users = [];
const bookings = [];

// Home Route
app.get('/', (req, res) => {
    res.send('Medicare Backend Server is Running!');
});

// Register API
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required.'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const existingUser = users.find(
            user => user.email === cleanEmail
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered. Please login!'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        users.push({
            email: cleanEmail,
            password: hashedPassword
        });

        res.json({
            success: true,
            message: 'Registration Successful!'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Registration failed.'
        });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required.'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = users.find(
            user => user.email === cleanEmail
        );

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

        res.json({
            success: true,
            email: user.email,
            message: 'Login successful!'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed.'
        });
    }
});

// Appointment Booking API
app.post('/api/book', (req, res) => {
    const { email, doctorName, date, timeSlot } = req.body;

    if (!email || !doctorName || !date || !timeSlot) {
        return res.status(400).json({
            success: false,
            message: 'All booking fields are required.'
        });
    }

    const tokenNumber = bookings.filter(
        booking =>
            booking.doctorName === doctorName &&
            booking.date === date
    ).length + 1;

    bookings.push({
        email,
        doctorName,
        date,
        timeSlot,
        tokenNumber
    });

    res.json({
        success: true,
        message: 'Appointment booked successfully!',
        tokenNumber
    });
});

// Queue Status API
app.get('/api/queue-status', (req, res) => {
    const { doctorName, date } = req.query;

    if (!doctorName || !date) {
        return res.status(400).json({
            success: false,
            message: 'Doctor name and date required.'
        });
    }

    const doctorBookings = bookings
        .filter(
            booking =>
                booking.doctorName === doctorName &&
                booking.date === date
        )
        .sort((a, b) => a.tokenNumber - b.tokenNumber);

    res.json({
        success: true,
        currentToken: doctorBookings.length > 0
            ? doctorBookings[0].tokenNumber
            : 0,
        totalBookings: doctorBookings.length
    });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

