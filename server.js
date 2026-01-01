require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// --- DEBUGGING: CHECK EMAIL VARIABLES ---
console.log("------------------------------------------------");
console.log("📧 EMAIL DEBUG START");
console.log("1. EMAIL_USER:", process.env.EMAIL_USER ? `'${process.env.EMAIL_USER}'` : "❌ MISSING");
console.log("2. EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ LOADED (Hidden)" : "❌ MISSING");
if (process.env.EMAIL_PASS) {
    console.log("3. PASSWORD LENGTH:", process.env.EMAIL_PASS.length); // Should be 16 or 19 (if spaces included)
}
console.log("------------------------------------------------");
// ----------------------------------------

// --- STRIPE INITIALIZATION ---
if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ FATAL ERROR: STRIPE_SECRET_KEY is missing in .env");
    process.exit(1);
}
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY.trim());

// --- IMPORT ROUTES ---
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes'); 

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
  origin: [
    "http://localhost:5173",                // Your laptop
    "https://eventease27.netlify.app"       // Your deployed website
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve the uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MOUNT ROUTES ---
app.use('/api/events', eventRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes); 

// --- STRIPE CHECKOUT ROUTE ---
app.post('/api/payment/create-checkout-session', async (req, res) => {
  const { eventId, title, price } = req.body;

  try {
    if (!price || !title || !eventId) {
      return res.status(400).json({ error: "Missing required event details" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: title },
          unit_amount: Math.round(parseFloat(price) * 100), 
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://eventease27.netlify.app/dashboard?status=success&eventId=${eventId}`,
      cancel_url: `https://eventease27.netlify.app/events/${eventId}?status=cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Session Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));