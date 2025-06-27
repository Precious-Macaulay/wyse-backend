import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  validateProfileUpdate, 
  validatePreferencesUpdate 
} from '../middleware/validation.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-passcode');
  
  res.status(200).json({
    message: 'Profile retrieved successfully',
    user: {
      id: user._id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      profile: user.profile,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
}));

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, validateProfileUpdate, asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, dateOfBirth } = req.body;
  
  const updateData = {};
  if (firstName !== undefined) updateData['profile.firstName'] = firstName;
  if (lastName !== undefined) updateData['profile.lastName'] = lastName;
  if (phone !== undefined) updateData['profile.phone'] = phone;
  if (dateOfBirth !== undefined) updateData['profile.dateOfBirth'] = dateOfBirth;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-passcode');

  res.status(200).json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      profile: user.profile,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
}));

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', authenticateToken, validatePreferencesUpdate, asyncHandler(async (req, res) => {
  const { preferences } = req.body;
  
  const updateData = {};
  if (preferences?.notifications?.email !== undefined) {
    updateData['preferences.notifications.email'] = preferences.notifications.email;
  }
  if (preferences?.notifications?.push !== undefined) {
    updateData['preferences.notifications.push'] = preferences.notifications.push;
  }
  if (preferences?.notifications?.sms !== undefined) {
    updateData['preferences.notifications.sms'] = preferences.notifications.sms;
  }
  if (preferences?.theme !== undefined) {
    updateData['preferences.theme'] = preferences.theme;
  }
  if (preferences?.currency !== undefined) {
    updateData['preferences.currency'] = preferences.currency;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-passcode');

  res.status(200).json({
    message: 'Preferences updated successfully',
    user: {
      id: user._id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      profile: user.profile,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
}));

/**
 * @route   GET /api/user/devices
 * @desc    Get user devices
 * @access  Private
 */
router.get('/devices', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('security.devices');
  
  res.status(200).json({
    message: 'Devices retrieved successfully',
    devices: user.security.devices
  });
}));

/**
 * @route   DELETE /api/user/devices/:deviceId
 * @desc    Remove a device
 * @access  Private
 */
router.delete('/devices/:deviceId', authenticateToken, asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { 'security.devices': { deviceId } } },
    { new: true }
  ).select('security.devices');

  res.status(200).json({
    message: 'Device removed successfully',
    devices: user.security.devices
  });
}));

/**
 * @route   GET /api/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  const stats = {
    accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // days
    lastLogin: user.lastLoginAt,
    devicesCount: user.security.devices.length,
    isEmailVerified: user.isEmailVerified,
    loginAttempts: user.loginAttempts,
    isLocked: user.isLocked
  };

  res.status(200).json({
    message: 'Stats retrieved successfully',
    stats
  });
}));

export default router; 