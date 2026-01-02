const express = require('express');
const router = express.Router();
const multer = require('multer'); 
const path = require('path');
const nodemailer = require('nodemailer'); 
const Event = require('../models/Event');
const User = require('../models/User'); 
const { isAdmin } = require('../middleware/authMiddleware');

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// --- BREVO EMAIL CONFIGURATION (FINAL) ---
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // Keep false for 587
  auth: {
    user: process.env.EMAIL_USER, // This will be the 9f257... ID from Render
    pass: process.env.EMAIL_PASS  // This will be the xkeysib... Key from Render
  }
});

// --- ROUTES ---

// 1. GET ALL EVENTS
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 }); 
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: "Error fetching events", error: err.message });
  }
});

// 2. GET SINGLE EVENT BY ID
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (err) {
    res.status(500).json({ message: "Invalid Event ID format", error: err.message });
  }
});

// 3. POST: ADD NEW EVENT
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, category, price, date, venue, description } = req.body;
    
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    const newEvent = new Event({
      title,
      category,
      price,
      date,
      venue,
      description,
      image: imagePath 
    });

    const savedEvent = await newEvent.save();

    // --- 🔔 BREVO EMAIL NOTIFICATION ---
    try {
      const users = await User.find({}, 'email');
      const emailList = users.map(user => user.email).filter(email => email);

      console.log("📧 PREPARING BREVO BROADCAST TO:", emailList.length, "USERS");

      if (emailList.length > 0) {
        const mailOptions = {
          // IMPORTANT: Use your verified Gmail here so users recognize you
          from: '"EventEase Team" <akshaygeorge2772@gmail.com>', 
          bcc: emailList, 
          subject: `🔥 New Event Alert: ${title}`,
          html: `
            <h1>New Event: ${title}</h1>
            <p>We are excited to announce a new event on ${new Date(date).toDateString()} at ${venue}.</p>
            <p>Price: ₹${price}</p>
            <br>
            <a href="https://eventease27.netlify.app/events">View Details</a>
          `
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error("❌ BREVO ERROR:", err);
          else console.log("✅ BREVO SENT:", info.response);
        });
      }
    } catch (emailErr) {
      console.error("Email Notification Logic Failed:", emailErr);
    }

    res.status(201).json({ message: "Event published successfully!", event: savedEvent });

  } catch (err) {
    console.error("Error saving event:", err); 
    res.status(400).json({ message: "Failed to save event", error: err.message });
  }
});

// 4. PUT: UPDATE EVENT
router.put('/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, category, price, date, venue, description } = req.body;
    let updateData = { title, category, price, date, venue, description };
    if (req.file) updateData.image = `/uploads/${req.file.filename}`;

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedEvent) return res.status(404).json({ message: "Event not found" });
    
    res.status(200).json(updatedEvent);
  } catch (err) {
    res.status(400).json({ message: "Update failed", error: err.message });
  }
});

// 5. DELETE EVENT
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).json({ message: "Event not found" });
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;