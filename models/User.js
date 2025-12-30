const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        default: 'user' 
    },
    // --- NEW FIELDS ADDED HERE ---
    phone: { 
        type: String, 
        default: "" 
    },
    profilePic: { 
        type: String, 
        default: "" 
    }
}, { timestamps: true }); // timestamps adds createdAt and updatedAt automatically

module.exports = mongoose.model('User', UserSchema);