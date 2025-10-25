import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import TimeSlot from '../models/TimeSlot';
import CustomField from '../models/CustomField';
import User, { IUser } from '../models/User';

// Extend Express Request interface
interface AuthRequest extends Request {
  userId?: string;
  user?: IUser;
}

// Time Slots Management
export const getTimeSlots = async (req: Request, res: Response) => {
  try {
    const timeSlots = await TimeSlot.find().sort({ dayOfWeek: 1, startTime: 1 });
    res.json({
      success: true,
      timeSlots
    });
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTimeSlot = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, timeSlots, specificDate, maxBookings, isActive } = req.body;
    const createdSlots = [];

    // Create time slots based on type
    if (type === 'specific' && specificDate) {
      // Create slots for specific date
      for (const slot of timeSlots) {
        const timeSlot = new TimeSlot({
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
    } else if (type === 'weekend') {
      // Create slots for weekend (Saturday and Sunday)
      for (const dayOfWeek of [0, 6]) { // Sunday and Saturday
        for (const slot of timeSlots) {
          const timeSlot = new TimeSlot({
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
    } else {
      // Create slots for all days (Monday to Sunday)
      for (const dayOfWeek of [1, 2, 3, 4, 5, 6, 0]) { // Monday to Sunday
        for (const slot of timeSlots) {
          const timeSlot = new TimeSlot({
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
  } catch (error) {
    console.error('Create time slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTimeSlot = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const timeSlot = await TimeSlot.findByIdAndUpdate(id, req.body, { new: true });

    if (!timeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }

    res.json({
      success: true,
      timeSlot
    });
  } catch (error) {
    console.error('Update time slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTimeSlot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timeSlot = await TimeSlot.findByIdAndDelete(id);

    if (!timeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }

    res.json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  } catch (error) {
    console.error('Delete time slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Custom Fields Management
export const getCustomFields = async (req: Request, res: Response) => {
  try {
    const customFields = await CustomField.find().sort({ order: 1 });
    res.json({
      success: true,
      customFields
    });
  } catch (error) {
    console.error('Get custom fields error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCustomField = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customField = new CustomField(req.body);
    await customField.save();

    res.status(201).json({
      success: true,
      customField
    });
  } catch (error) {
    console.error('Create custom field error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCustomField = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const customField = await CustomField.findByIdAndUpdate(id, req.body, { new: true });

    if (!customField) {
      return res.status(404).json({ message: 'Custom field not found' });
    }

    res.json({
      success: true,
      customField
    });
  } catch (error) {
    console.error('Update custom field error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customField = await CustomField.findByIdAndDelete(id);

    if (!customField) {
      return res.status(404).json({ message: 'Custom field not found' });
    }

    res.json({
      success: true,
      message: 'Custom field deleted successfully'
    });
  } catch (error) {
    console.error('Delete custom field error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Users Management
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filter: any = {};
    if (role) filter.role = role;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

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
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
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
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email, name, role, phone, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }

    if (email) user.email = email;
    if (name) user.name = name;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

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
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
