import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: [6, 'OTP must be exactly 6 digits']
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset', 'login'],
    default: 'email_verification'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index to auto-delete expired OTPs
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for faster queries
otpSchema.index({ email: 1, type: 1 });

// Static method to create OTP
otpSchema.statics.createOTP = function(email, type = 'email_verification', ipAddress = null, userAgent = null) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return this.create({
    email: email.toLowerCase(),
    otp,
    type,
    expiresAt,
    ipAddress,
    userAgent
  });
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp, type = 'email_verification') {
  const otpDoc = await this.findOne({
    email: email.toLowerCase(),
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!otpDoc) {
    return { isValid: false, message: 'Invalid or expired OTP' };
  }

  // Increment attempts
  otpDoc.attempts += 1;
  
  // Mark as used if valid (except for password_reset which will be marked later)
  if (otpDoc.otp === otp) {
    if (type !== 'password_reset') {
      otpDoc.isUsed = true;
    }
    await otpDoc.save();
    return { isValid: true, message: 'OTP verified successfully' };
  }

  await otpDoc.save();
  return { isValid: false, message: 'Invalid OTP' };
};

// Static method to verify OTP without marking as used (for password reset)
otpSchema.statics.verifyOTPWithoutMarking = async function(email, otp, type = 'email_verification') {
  const otpDoc = await this.findOne({
    email: email.toLowerCase(),
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!otpDoc) {
    return { isValid: false, message: 'Invalid or expired OTP' };
  }

  // Increment attempts
  otpDoc.attempts += 1;
  
  // Don't mark as used, just verify
  if (otpDoc.otp === otp) {
    await otpDoc.save();
    return { isValid: true, message: 'OTP verified successfully' };
  }

  await otpDoc.save();
  return { isValid: false, message: 'Invalid OTP' };
};

// Static method to get active OTP for email
otpSchema.statics.getActiveOTP = function(email, type = 'email_verification') {
  return this.findOne({
    email: email.toLowerCase(),
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

// Static method to invalidate all OTPs for an email
otpSchema.statics.invalidateOTPs = function(email, type = 'email_verification') {
  return this.updateMany(
    {
      email: email.toLowerCase(),
      type,
      isUsed: false
    },
    {
      $set: { isUsed: true }
    }
  );
};

// Static method to clean up expired OTPs
otpSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP; 