const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ensure this model exists

// 1. REGISTER
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, adminCode } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // If code matches, they become admin
        const userRole = (adminCode === 'SECRET@123') ? 'admin' : 'user';

        const newUser = new User({ fullName, email, password, role: userRole });
        await newUser.save();

        res.status(201).json({ message: "Registration successful!" });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Error creating user" });
    }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        // Note: In production, compare hashed passwords using bcrypt
        if (user && user.password === password) {
            res.json({ id: user._id, fullName: user.fullName, role: user.role });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// 3. GET USER BY ID (For Profile Page)
router.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error("Fetch User Error:", err);
        res.status(500).json({ message: "Failed to fetch user details" });
    }
});

// 4. UPDATE USER PROFILE
router.put('/user/:id', async (req, res) => {
    try {
        const { fullName, email, phone, profilePic } = req.body;

        // Build the update object dynamically
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (profilePic) updateData.profilePic = profilePic;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(updatedUser);
    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

module.exports = router;