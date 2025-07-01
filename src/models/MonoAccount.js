import mongoose from 'mongoose';

const monoAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: String, required: true },
  institution: {
    name: String,
    bank_code: String,
    bank_type: String
  },
  account_number: String,
  name: String,
  balance: Number,
  type: String,
  currency: String,
  bvn: String,
  linkedAt: { type: Date, default: Date.now },
  lastSynced: { type: Date },
  meta: {
    data_status: String,
    auth_method: String,
    session_id: String
  }
}, { timestamps: true });

const MonoAccount = mongoose.model('MonoAccount', monoAccountSchema);

export default MonoAccount; 