"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = exports.deleteCustomField = exports.updateCustomField = exports.createCustomField = exports.getCustomFields = exports.deleteTimeSlot = exports.updateTimeSlot = exports.createTimeSlot = exports.getTimeSlots = void 0;
const express_validator_1 = require("express-validator");
const TimeSlot_1 = __importDefault(require("../models/TimeSlot"));
const CustomField_1 = __importDefault(require("../models/CustomField"));
const User_1 = __importDefault(require("../models/User"));
// Time Slots Management
const getTimeSlots = async (req, res) => {
    try {
        const timeSlots = await TimeSlot_1.default.find().sort({ dayOfWeek: 1, startTime: 1 });
        res.json({
            success: true,
            timeSlots
        });
    }
    catch (error) {
        console.error('Get time slots error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTimeSlots = getTimeSlots;
const createTimeSlot = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { type, timeSlots, specificDate, maxBookings, isActive } = req.body;
        const createdSlots = [];
        // Create time slots based on type
        if (type === 'specific' && specificDate) {
            // Create slots for specific date
            for (const slot of timeSlots) {
                const timeSlot = new TimeSlot_1.default({
                    dayOfWeek: new Date(specificDate).getDay(),
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive,
                    isWeekend: false,
                    specificDate: new Date(specificDate),
                    maxBookings,
                    currentBookings: 0
                });
                await timeSlot.save();
                createdSlots.push(timeSlot);
            }
        }
        else if (type === 'weekend') {
            // Create slots for weekend (Saturday and Sunday)
            for (const dayOfWeek of [0, 6]) { // Sunday and Saturday
                for (const slot of timeSlots) {
                    const timeSlot = new TimeSlot_1.default({
                        dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isActive,
                        isWeekend: true,
                        maxBookings,
                        currentBookings: 0
                    });
                    await timeSlot.save();
                    createdSlots.push(timeSlot);
                }
            }
        }
        else {
            // Create slots for all days (Monday to Sunday)
            for (const dayOfWeek of [1, 2, 3, 4, 5, 6, 0]) { // Monday to Sunday
                for (const slot of timeSlots) {
                    const timeSlot = new TimeSlot_1.default({
                        dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isActive,
                        isWeekend: false,
                        maxBookings,
                        currentBookings: 0
                    });
                    await timeSlot.save();
                    createdSlots.push(timeSlot);
                }
            }
        }
        res.status(201).json({
            success: true,
            timeSlots: createdSlots,
            message: `Created ${createdSlots.length} time slots`
        });
    }
    catch (error) {
        console.error('Create time slot error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTimeSlot = createTimeSlot;
const updateTimeSlot = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const timeSlot = await TimeSlot_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!timeSlot) {
            return res.status(404).json({ message: 'Time slot not found' });
        }
        res.json({
            success: true,
            timeSlot
        });
    }
    catch (error) {
        console.error('Update time slot error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTimeSlot = updateTimeSlot;
const deleteTimeSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const timeSlot = await TimeSlot_1.default.findByIdAndDelete(id);
        if (!timeSlot) {
            return res.status(404).json({ message: 'Time slot not found' });
        }
        res.json({
            success: true,
            message: 'Time slot deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete time slot error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTimeSlot = deleteTimeSlot;
// Custom Fields Management
const getCustomFields = async (req, res) => {
    try {
        const customFields = await CustomField_1.default.find().sort({ order: 1 });
        res.json({
            success: true,
            customFields
        });
    }
    catch (error) {
        console.error('Get custom fields error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getCustomFields = getCustomFields;
const createCustomField = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const customField = new CustomField_1.default(req.body);
        await customField.save();
        res.status(201).json({
            success: true,
            customField
        });
    }
    catch (error) {
        console.error('Create custom field error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createCustomField = createCustomField;
const updateCustomField = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const customField = await CustomField_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!customField) {
            return res.status(404).json({ message: 'Custom field not found' });
        }
        res.json({
            success: true,
            customField
        });
    }
    catch (error) {
        console.error('Update custom field error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateCustomField = updateCustomField;
const deleteCustomField = async (req, res) => {
    try {
        const { id } = req.params;
        const customField = await CustomField_1.default.findByIdAndDelete(id);
        if (!customField) {
            return res.status(404).json({ message: 'Custom field not found' });
        }
        res.json({
            success: true,
            message: 'Custom field deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete custom field error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteCustomField = deleteCustomField;
// Users Management
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        let filter = {};
        if (role)
            filter.role = role;
        // Add search functionality
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        const users = await User_1.default.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await User_1.default.countDocuments(filter);
        res.json({
            success: true,
            users,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total,
                limit: Number(limit)
            }
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, name, role, phone } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = new User_1.default({
            email,
            password,
            name,
            role,
            phone
        });
        await user.save();
        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
                isActive: user.isActive
            }
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { email, name, role, phone, isActive } = req.body;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const existingUser = await User_1.default.findOne({ email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already taken' });
            }
        }
        if (email)
            user.email = email;
        if (name)
            user.name = name;
        if (role)
            user.role = role;
        if (phone !== undefined)
            user.phone = phone;
        if (isActive !== undefined)
            user.isActive = isActive;
        await user.save();
        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
                isActive: user.isActive
            }
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent deleting self
        if (id === req.userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=adminController.js.map