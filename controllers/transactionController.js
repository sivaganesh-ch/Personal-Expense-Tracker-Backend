const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');


// @desc    Get all transactions with filtering and pagination
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
    const { page = 1, limit = 10, search, category, startDate, endDate } = req.query;

    const query = { user: req.user.id };

    if (search) {
        query.title = { $regex: search, $options: 'i' };
    }

    if (category && category !== 'All') {
        query.category = category;
    }

    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            query.date.$gte = new Date(startDate);
        }
        if (endDate) {
            query.date.$lte = new Date(endDate);
        }
    }

    try {
        const transactions = await Transaction.find(query)
            .sort({ date: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Transaction.countDocuments(query);

        res.status(200).json({
            transactions,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a transaction
// @route   POST /api/transactions
// @access  Private
const addTransaction = async (req, res) => {
    const { title, amount, category, date, notes } = req.body;

    try {
        const transaction = await Transaction.create({
            title,
            amount,
            category,
            date,
            notes,
            user: req.user.id,
        });

        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Check for user
        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Make sure the logged in user matches the transaction user
        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json(updatedTransaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await transaction.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Summary (Total income, expense, balance)
// @route   GET /api/transactions/summary
// @access  Private
const getSummary = async (req, res) => {
    try {
        const userId = req.user.id; // user is guaranteed by auth middleware

        const summary = await Transaction.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalIncome: {
                        $sum: {
                            $cond: [{ $gt: ["$amount", 0] }, "$amount", 0]
                        }
                    },
                    totalExpense: {
                        $sum: {
                            $cond: [{ $lt: ["$amount", 0] }, "$amount", 0]
                        }
                    }
                }
            }
        ]);

        const categoryBreakdown = await Transaction.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: "$category",
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        res.status(200).json({
            summary: summary[0] || { totalIncome: 0, totalExpense: 0 }, // Handling empty result
            categoryBreakdown
        });
    } catch (error) { // Missing mongoose import in this block
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getSummary,
};
