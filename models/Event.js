const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: String, required: true },
    date: { type: String, required: true },
    venue: { type: String, required: true },
    description: { type: String, required: true }, //
    image: { type: String } // Stores the path from the browse button
});

module.exports = mongoose.model('Event', EventSchema);