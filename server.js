require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// --- STRIPE INITIALIZATION ---
if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ FATAL ERROR: STRIPE_SECRET_KEY is missing in .env");
    process.exit(1);
}
// .trim() removes accidental spaces from .env
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY.trim());

// --- IMPORT ROUTES ---
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes'); 

const app = express();

// --- MIDDLEWARE (UPDATED FOR CORS) ---
// This allows both your Localhost and your Netlify site to access the backend
app.use(cors({
  origin: [
    "http://localhost:5173",                 // For local testing
    "https://eventease27.netlify.app"        // For your live website
  ],
  credentials: true
}));

// Increase body size limit to 50MB for large image uploads
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
      
      // Pass eventId back so we can register the user after payment
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