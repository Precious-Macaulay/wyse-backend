import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  monoId: { type: String, required: true }, // id from Mono
  monoAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'MonoAccount', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  narration: String,
  amount: Number,
  type: { type: String, enum: ['credit', 'debit'] },
  category: String,
  currency: String,
  balance: Number,
  date: { type: Date, required: true },
  raw: { type: Object }, // for any extra data
}, { timestamps: true });

transactionSchema.index({ monoId: 1, monoAccount: 1 }, { unique: true }); // prevent duplicates
transactionSchema.index({ user: 1, date: -1 }); // for fast user/date queries

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction; 