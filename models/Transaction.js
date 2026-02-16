const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a text'],
        trim: true,
    },
    amount: {
        type: Number,
        required: [true, 'Please add a positive or negative number'],
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Health', 'Other', 'Salary', 'Investment', 'Income'], // Basic categories + income
    },
    date: {
        type: Date,
        default: Date.now,
    },
    notes: {
        type: String,
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
