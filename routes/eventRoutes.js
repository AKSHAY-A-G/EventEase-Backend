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

// --- EMAIL CONFIGURATION (UPDATED FOR RENDER) ---
// Using Port 465 (SSL) to prevent timeouts
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
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

// 3. POST: ADD NEW EVENT (Protected + Image Upload + Email Notification)
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

    // --- 🔔 SEND EMAIL NOTIFICATION TO ALL USERS ---
    try {
      const users = await User.find({}, 'email');
      const emailList = users.map(user => user.email).filter(email => email);

      if (emailList.length > 0) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          bcc: emailList, 
          subject: `🔥 New Event Alert: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
              <div style="background-color: #2563EB; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">New Event Announced!</h1>
              </div>
              
              <div style="padding: 20px; background-color: #ffffff;">
                <h2 style="color: #333; margin-top: 0;">${title}</h2>
                <p style="color: #555; font-size: 16px;">
                  We are excited to announce a new event! Check out the details below:
                </p>
                
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${new Date(date).toDateString()}</p>
                  <p style="margin: 5px 0;"><strong>📍 Venue:</strong> ${venue}</p>
                  <p style="margin: 5px 0;"><strong>💰 Price:</strong> ₹${price}</p>
                </div>

                <p style="color: #475569;">${description.substring(0, 150)}...</p>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://eventease27.netlify.app/events" 
                      style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                      View Event Details
                  </a>
                </div>
              </div>
              
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; color: #64748b; font-size: 12px;">
                &copy; ${new Date().getFullYear()} EventEase. All rights reserved.
              </div>
            </div>
          `
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error("❌ Error sending broadcast email:", err);
          else console.log("✅ Broadcast email sent to " + emailList.length + " users.");
        });
      }
    } catch (emailErr) {
      console.error("Email Notification Failed (Event still saved):", emailErr);
    }

    res.status(201).json({ message: "Event published successfully!", event: savedEvent });

  } catch (err) {
    console.error("Error saving event:", err); 
    res.status(400).json({ message: "Failed to save event", error: err.message });
  }
});

// 4. PUT: UPDATE EXISTING EVENT
router.put('/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, category, price, date, venue, description } = req.body;
    
    let updateData = {
      title,
      category,
      price,
      date,
      venue,
      description
    };

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found to update" });
    }
    res.status(200).json(updatedEvent);
  } catch (err) {
    res.status(400).json({ message: "Update failed", error: err.message });
  }
});

// 5. DELETE: REMOVE EVENT
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found to delete" });
    }
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;