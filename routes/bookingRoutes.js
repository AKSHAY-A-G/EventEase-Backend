const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking'); 
const Event = require('../models/Event');
const nodemailer = require('nodemailer'); 

// --- BREVO EMAIL CONFIGURATION (FINAL FIREWALL BYPASS) ---
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525,     // ⚠️ Port 2525 is the secret alternative to 587
  secure: false,  // False for 2525
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // ⚠️ Force IPv4 to prevent DNS timeouts
  family: 4 
});

// --- 1. CREATE BOOKING + SEND TICKET EMAIL ---
router.post('/', async (req, res) => {
  const { userId, eventId } = req.body;

  try {
    // 1. Check if booking already exists
    const existingBooking = await Booking.findOne({ user: userId, event: eventId });
    if (existingBooking) {
      return res.status(400).json({ message: "You have already registered for this event." });
    }

    // 2. Create and Save the New Booking
    const newBooking = new Booking({
      user: userId,
      event: eventId,
      status: 'confirmed',
      paymentStatus: 'paid'
    });

    await newBooking.save();

    // 3. FETCH DETAILS FOR EMAIL (Populate User and Event data)
    // We need the User's email and Event's title/date/venue
    const fullBooking = await newBooking.populate(['user', 'event']);

    if (fullBooking.user && fullBooking.event) {
        // 4. GENERATE EMAIL CONTENT
        const ticketId = fullBooking._id; // This is the Unique ID
        const userEmail = fullBooking.user.email;
        const userName = fullBooking.user.name || fullBooking.user.fullName || "Event Enthusiast";
        const eventTitle = fullBooking.event.title;
        // Format date nicely
        const eventDate = new Date(fullBooking.event.date).toDateString();
        const eventVenue = fullBooking.event.venue;

        const mailOptions = {
          // IMPORTANT: Use your verified Gmail here so users recognize you
          from: '"EventEase Team" <akshaygeorge2772@gmail.com>', 
          to: userEmail,
          subject: `🎟️ Your Ticket for ${eventTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
              
              <div style="background-color: #2563EB; padding: 20px; text-align: center; color: white;">
                <img 
                  src="https://eventease27.netlify.app/Images/logo.png" 
                  alt="EventEase" 
                  style="width: 60px; height: auto; margin-bottom: 10px;" 
                />
                
                <h1 style="margin: 0;">Event Ticket</h1>
                <p style="margin: 5px 0 0;">Booking Confirmed</p>
              </div>
              
              <div style="padding: 20px; background-color: #ffffff;">
                <p>Hi <strong>${userName}</strong>,</p>
                <p>Thank you for booking! Here is your official ticket.</p>
                
                <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #1e293b; margin-top: 0;">${eventTitle}</h2>
                  <p><strong>📅 Date:</strong> ${eventDate}</p>
                  <p><strong>📍 Venue:</strong> ${eventVenue}</p>
                  <p><strong>🆔 Ticket ID:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${ticketId}</span></p>
                </div>

                <p style="color: #64748b; font-size: 14px;">Please show this email or Ticket ID at the entrance.</p>
              </div>
              
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; color: #64748b; font-size: 12px;">
                &copy; ${new Date().getFullYear()} EventEase. All rights reserved.
              </div>
            </div>
          `
        };

        // 5. SEND EMAIL
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("❌ Error sending email:", error);
          } else {
            console.log('✅ Email sent successfully:', info.response);
          }
        });
    }

    res.status(201).json({ message: "Booking confirmed and Ticket sent!", booking: newBooking });

  } catch (err) {
    console.error("Booking Creation Error:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// --- 2. GET ALL BOOKINGS (For Admin) ---
router.get('/all', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user') 
      .populate('event', 'title price'); 
    res.json(bookings);
  } catch (err) {
    console.error("Fetch All Error:", err);
    res.status(500).json({ error: "Failed to fetch all bookings" });
  }
});

// --- 3. GET BOOKINGS BY EVENT ID ---
router.get('/event/:eventId', async (req, res) => {
  try {
    const bookings = await Booking.find({ event: req.params.eventId })
      .populate('user')
      .populate('event', 'title');
    res.json(bookings);
  } catch (err) {
    console.error("Fetch Event Bookings Error:", err);
    res.status(500).json({ error: "Failed to fetch event bookings" });
  }
});

// --- 4. GET BOOKINGS BY USER ID ---
router.get('/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .populate('event'); 
    res.json(bookings);
  } catch (err) {
    console.error("Fetch User Bookings Error:", err);
    res.status(500).json({ error: "Failed to fetch user bookings" });
  }
});

module.exports = router;