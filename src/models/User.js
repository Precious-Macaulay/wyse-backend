import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passcode: {
    type: String,
    required: [true, 'Passcode is required'],
    minlength: [6, 'Passcode must be at least 6 characters'],
    maxlength: [6, 'Passcode must be exactly 6 characters']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    dateOfBirth: Date,
    avatar: String
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    currency: {
      type: String,
      default: 'NGN'
    }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    lastPasswordChange: { type: Date, default: Date.now },
    devices: [{
      deviceId: String,
      deviceName: String,
      lastUsed: Date,
      ipAddress: String,
      userAgent: String
    }]
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passcode;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash passcode
userSchema.pre('save', async function(next) {
  if (!this.isModified('passcode')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.passcode = await bcrypt.hash(this.passcode, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare passcode
userSchema.methods.comparePasscode = async function(candidatePasscode) {
  return bcrypt.compare(candidatePasscode, this.passcode);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLoginAt: new Date() }
  });
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to create user
userSchema.statics.createUser = function(userData) {
  return this.create(userData);
};

const User = mongoose.model('User', userSchema);

export default User; 