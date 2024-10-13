const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [{
        type: { type: String, enum: ['text', 'file'], required: true },
        text: { type: String }, // Only for text messages
        fileUrl: { type: String }, // Only for file messages
        fileType: { type: String }, 
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
    }],
    createdAt: { type: Date, default: Date.now },
});

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;
