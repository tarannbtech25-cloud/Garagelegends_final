const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'garage-legends-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: false
    }
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// ── Auth Middleware ─────────────────────────────────────────
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'You must be logged in.' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }
    next();
}

// ══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    try {
        // Check if user exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'Username or email already taken.' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, password_hash]
        );

        // Auto login after signup
        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.email = email;
        req.session.role = 'user';

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            user: { id: result.insertId, username, email, role: 'user' }
        });
    } catch (error) {
        console.error('Signup error:', error.message);
        res.status(500).json({ success: false, error: 'Server error during signup.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;
        req.session.role = user.role;

        res.json({
            success: true,
            message: 'Logged in successfully!',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, error: 'Server error during login.' });
    }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Logged out.' });
    });
});

// GET /api/me – Get current logged-in user
app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.json({ success: false, loggedIn: false });
    }
    res.json({
        success: true,
        loggedIn: true,
        user: {
            id: req.session.userId,
            username: req.session.username,
            email: req.session.email,
            role: req.session.role
        }
    });
});

// ══════════════════════════════════════════════════════════════
// CONTACT ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/contact
app.post('/api/contact', async (req, res) => {
    const { full_name, email, model_interest, message } = req.body;
    const user_id = req.session.userId || null;

    if (!full_name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Please fill in all required fields.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO contacts (user_id, full_name, email, model_interest, message) VALUES (?, ?, ?, ?, ?)',
            [user_id, full_name, email, model_interest || 'General Inquiry', message]
        );
        res.status(201).json({ success: true, message: 'Your message has been received!', id: result.insertId });
    } catch (error) {
        console.error('Error saving contact:', error.message);
        res.status(500).json({ success: false, error: 'Server error. Please try again.' });
    }
});

// GET /api/contacts (admin) -- uses JOIN to show user info
app.get('/api/contacts', requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT c.*, u.username AS submitted_by
            FROM contacts c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching contacts:', error.message);
        res.status(500).json({ success: false, error: 'Failed to retrieve contacts.' });
    }
});

// ══════════════════════════════════════════════════════════════
// VEHICLE ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/vehicles
app.get('/api/vehicles', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM vehicles ORDER BY category, id');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching vehicles:', error.message);
        res.status(500).json({ success: false, error: 'Failed to retrieve vehicles.' });
    }
});

// GET /api/vehicles/category/:category
app.get('/api/vehicles/category/:category', async (req, res) => {
    const { category } = req.params;
    if (!['car', 'bike'].includes(category)) {
        return res.status(400).json({ success: false, error: 'Category must be "car" or "bike".' });
    }
    try {
        const [rows] = await pool.execute('SELECT * FROM vehicles WHERE category = ? ORDER BY id', [category]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to retrieve vehicles.' });
    }
});

// GET /api/vehicles/by-page/:page – get vehicle by detail_page name
app.get('/api/vehicles/by-page/:page', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM vehicles WHERE detail_page = ?', [req.params.page]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Vehicle not found.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to retrieve vehicle.' });
    }
});

// ══════════════════════════════════════════════════════════════
// BOOKING ROUTES (uses JOINs)
// ══════════════════════════════════════════════════════════════

// POST /api/bookings – Create a test drive booking
app.post('/api/bookings', requireLogin, async (req, res) => {
    const { vehicle_id, preferred_date, preferred_time, notes } = req.body;

    if (!vehicle_id || !preferred_date || !preferred_time) {
        return res.status(400).json({ success: false, error: 'Vehicle, date, and time are required.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO test_drive_bookings (user_id, vehicle_id, preferred_date, preferred_time, notes) VALUES (?, ?, ?, ?, ?)',
            [req.session.userId, vehicle_id, preferred_date, preferred_time, notes || null]
        );
        res.status(201).json({ success: true, message: 'Test drive booked successfully!', id: result.insertId });
    } catch (error) {
        console.error('Booking error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to create booking.' });
    }
});

// GET /api/bookings – Get current user's bookings (JOIN with vehicles)
app.get('/api/bookings', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, v.name AS vehicle_name, v.category, v.image_filename
            FROM test_drive_bookings b
            INNER JOIN vehicles v ON b.vehicle_id = v.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [req.session.userId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching bookings:', error.message);
        res.status(500).json({ success: false, error: 'Failed to retrieve bookings.' });
    }
});

// DELETE /api/bookings/:id – Cancel a booking
app.delete('/api/bookings/:id', requireLogin, async (req, res) => {
    try {
        const [result] = await pool.execute(
            'UPDATE test_drive_bookings SET status = "cancelled" WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }
        res.json({ success: true, message: 'Booking cancelled.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to cancel booking.' });
    }
});

// ══════════════════════════════════════════════════════════════
// REVIEW ROUTES (uses JOINs)
// ══════════════════════════════════════════════════════════════

// POST /api/reviews – Submit a review
app.post('/api/reviews', requireLogin, async (req, res) => {
    const { vehicle_id, rating, review_text } = req.body;

    if (!vehicle_id || !rating) {
        return res.status(400).json({ success: false, error: 'Vehicle and rating are required.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
    }

    try {
        await pool.execute(
            'INSERT INTO reviews (user_id, vehicle_id, rating, review_text) VALUES (?, ?, ?, ?)',
            [req.session.userId, vehicle_id, rating, review_text || null]
        );
        res.status(201).json({ success: true, message: 'Review submitted successfully!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'You have already reviewed this vehicle.' });
        }
        console.error('Review error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to submit review.' });
    }
});

// GET /api/reviews/:vehicleId – Get reviews for a vehicle (JOIN with users)
app.get('/api/reviews/:vehicleId', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT r.*, u.username
            FROM reviews r
            INNER JOIN users u ON r.user_id = u.id
            WHERE r.vehicle_id = ?
            ORDER BY r.created_at DESC
        `, [req.params.vehicleId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching reviews:', error.message);
        res.status(500).json({ success: false, error: 'Failed to retrieve reviews.' });
    }
});

// ══════════════════════════════════════════════════════════════
// ADMIN ROUTES (password-protected, uses JOINs + aggregates)
// ══════════════════════════════════════════════════════════════

// POST /api/admin/login – Admin login
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND role = "admin"', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;
        req.session.role = user.role;

        res.json({ success: true, message: 'Admin authenticated.' });
    } catch (error) {
        console.error('Admin login error:', error.message);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});

// GET /api/admin/stats – Dashboard statistics (aggregate queries)
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const [[{ totalUsers }]] = await pool.execute('SELECT COUNT(*) AS totalUsers FROM users');
        const [[{ totalBookings }]] = await pool.execute('SELECT COUNT(*) AS totalBookings FROM test_drive_bookings');
        const [[{ totalContacts }]] = await pool.execute('SELECT COUNT(*) AS totalContacts FROM contacts');
        const [[{ totalReviews }]] = await pool.execute('SELECT COUNT(*) AS totalReviews FROM reviews');
        const [[{ pendingBookings }]] = await pool.execute('SELECT COUNT(*) AS pendingBookings FROM test_drive_bookings WHERE status = "pending"');

        res.json({
            success: true,
            data: { totalUsers, totalBookings, totalContacts, totalReviews, pendingBookings }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch stats.' });
    }
});

// GET /api/admin/bookings – All bookings (JOIN users + vehicles)
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, u.username, u.email AS user_email, v.name AS vehicle_name, v.category
            FROM test_drive_bookings b
            INNER JOIN users u ON b.user_id = u.id
            INNER JOIN vehicles v ON b.vehicle_id = v.id
            ORDER BY b.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to retrieve bookings.' });
    }
});

// PATCH /api/admin/bookings/:id – Update booking status
app.patch('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    try {
        await pool.execute('UPDATE test_drive_bookings SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: 'Booking status updated.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update booking.' });
    }
});

// GET /api/admin/reviews – All reviews (JOIN users + vehicles)
app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT r.*, u.username, v.name AS vehicle_name
            FROM reviews r
            INNER JOIN users u ON r.user_id = u.id
            INNER JOIN vehicles v ON r.vehicle_id = v.id
            ORDER BY r.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to retrieve reviews.' });
    }
});

// GET /api/admin/users – All users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT u.id, u.username, u.email, u.role, u.created_at,
                   COUNT(DISTINCT b.id) AS booking_count,
                   COUNT(DISTINCT r.id) AS review_count
            FROM users u
            LEFT JOIN test_drive_bookings b ON u.id = b.user_id
            LEFT JOIN reviews r ON u.id = r.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
    }
});

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`\n🚗  Garage Legends server is running at  http://localhost:${PORT}`);
    console.log(`📡  API endpoints:`);
    console.log(`    AUTH:     POST /api/signup, /api/login, /api/logout | GET /api/me`);
    console.log(`    CONTACT:  POST /api/contact | GET /api/contacts (admin)`);
    console.log(`    VEHICLES: GET  /api/vehicles, /api/vehicles/category/:cat, /api/vehicles/by-page/:page`);
    console.log(`    BOOKING:  POST /api/bookings | GET /api/bookings | DELETE /api/bookings/:id`);
    console.log(`    REVIEWS:  POST /api/reviews | GET /api/reviews/:vehicleId`);
    console.log(`    ADMIN:    POST /api/admin/login | GET /api/admin/stats, /bookings, /reviews, /users, /contacts\n`);
    await testConnection();
});
