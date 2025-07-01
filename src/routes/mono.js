import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import MonoAccount from '../models/MonoAccount.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

const BASE_URL = 'https://api.withmono.com/v2';

// GET /api/mono/account-data?accountId=xxx
router.get('/account-data', authenticateToken, async (req, res) => {
  const { accountId } = req.query;
  const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY;
  if (!accountId) {
    return res.status(400).json({ error: 'Missing accountId query parameter.' });
  }
  if (!MONO_SECRET_KEY) {
    return res.status(500).json({ error: 'MONO_SECRET_KEY not set in environment.' });
  }
  // Check if user has this account linked (relational)
  const monoAccount = await MonoAccount.findOne({ user: req.user._id, accountId });
  if (!monoAccount) {
    return res.status(404).json({ error: 'Account not linked to this user.' });
  }
  try {
    // Fetch account info
    const accountInfoRes = await axios.get(`${BASE_URL}/accounts/${accountId}`, {
      headers: { 'mono-sec-key': MONO_SECRET_KEY }
    });
    // Fetch transactions
    const transactionsRes = await axios.get(`${BASE_URL}/accounts/${accountId}/transactions`, {
      headers: { 'mono-sec-key': MONO_SECRET_KEY }
    });
    res.json({
      accountInfo: accountInfoRes.data.data,
      transactions: transactionsRes.data.data
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Helper to fetch all pages of transactions
async function fetchAllTransactions(accountId, MONO_SECRET_KEY, maxPages = 10) {
  let allTx = [];
  let page = 1;
  let nextUrl = `${BASE_URL}/accounts/${accountId}/transactions`;
  while (nextUrl && page <= maxPages) {
    const res = await axios.get(nextUrl, { headers: { 'mono-sec-key': MONO_SECRET_KEY } });
    const data = res.data.data || [];
    allTx = allTx.concat(data);
    const meta = res.data.meta || {};
    nextUrl = meta.next || null;
    page++;
  }
  return allTx;
}

// POST /api/mono/exchange-code
router.post('/exchange-code', authenticateToken, async (req, res) => {
  const { code } = req.body;
  const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY;
  if (!code) {
    return res.status(400).json({ error: 'Missing code in request body.' });
  }
  if (!MONO_SECRET_KEY) {
    return res.status(500).json({ error: 'MONO_SECRET_KEY not set in environment.' });
  }
  try {
    // Exchange code for accountId and access token
    const response = await axios.post(
      `${BASE_URL}/accounts/auth`,
      { code },
      { headers: { 'mono-sec-key': MONO_SECRET_KEY, 'Content-Type': 'application/json' } }
    );
    const { id: accountId } = response.data.data;
    // Fetch account info from Mono
    const accountInfoRes = await axios.get(`${BASE_URL}/accounts/${accountId}`, {
      headers: { 'mono-sec-key': MONO_SECRET_KEY }
    });
    const accountData = accountInfoRes.data.data.account;

    // Fetch transactions from Mono (all pages, up to maxPages)
    const maxPages = parseInt(process.env.MONO_TX_MAX_PAGES) || 10;
    const transactions = await fetchAllTransactions(accountId, MONO_SECRET_KEY, maxPages);

    // Update user data in the database
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    console.log('accountData', accountData);
    console.log('user', user);
    console.log('req.user._id', req.user._id);
    console.log('institution', typeof accountData.institution, accountData.institution);
    // Check if account already linked (relational)
    let monoAccount = await MonoAccount.findOne({ user: user._id, accountId: accountData.id });
    if (!monoAccount) {
      const newMonoAccount = {
        user: user._id,
        accountId: accountData.id,
        institution: {
          name: accountData.institution.name,
          bank_code: accountData.institution.bank_code,
          bank_type: accountData.institution.type
        },
        account_number: accountData.account_number,
        name: accountData.name,
        balance: accountData.balance,
        type: accountData.type,
        currency: accountData.currency,
        bvn: accountData.bvn,
        linkedAt: new Date(),
        meta: accountInfoRes.data.data.meta || {}
      }

      console.log('newMonoAccount', newMonoAccount);
      monoAccount = await MonoAccount.create(newMonoAccount);
      console.log('monoAccount', monoAccount);
      user.monoAccounts.push(monoAccount._id);
      await user.save();
    }

    // Save transactions to DB (upsert by monoId+monoAccount)
    for (const tx of transactions) {
      const savedTransaction = await Transaction.findOneAndUpdate(
        { monoId: tx.id, monoAccount: monoAccount._id },
        {
          monoId: tx.id,
          monoAccount: monoAccount._id,
          user: user._id,
          narration: tx.narration,
          amount: tx.amount,
          type: tx.type,
          category: tx.category || null,
          currency: tx.currency,
          balance: tx.balance,
          date: tx.date,
          raw: tx
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Insert each transaction into the user's MindsDB knowledge base after saving to MongoDB
      try {
        const mindsdbService = (await import('../services/mindsdbService.js')).default;
        await mindsdbService.createKnowledgeBase(user._id);
        await mindsdbService.insertTransaction({
          narration: tx.narration,
          amount: tx.amount,
          type: tx.type,
          category: tx.category || 'uncategorized',
          currency: tx.currency,
          date: new Date(tx.date),
          userId: user._id,
          accountId: monoAccount._id,
          institutionName: accountData.institution.name
        });
      } catch (mindsdbError) {
        console.warn('Failed to insert transaction into MindsDB:', mindsdbError);
        // I don't want a MindsDB error to block the sync
      }
    }

    // After syncing, ensure a background job is set up to keep the KB updated
    try {
      const mindsdbService = (await import('../services/mindsdbService.js')).default;
      await mindsdbService.createUserSyncJob(user._id);
    } catch (jobError) {
      console.warn('Failed to create MindsDB sync JOB:', jobError);
    }

    // Return all linked accounts (populated)
    const populatedUser = await User.findById(user._id).populate('monoAccounts');
    res.json({
      message: 'Mono account linked successfully',
      monoAccounts: populatedUser.monoAccounts
    });
  } catch (err) {
    console.log('err', err);
    res.status(500).json({ error: 'Failed to link Mono account' });
  }
});

// GET /api/mono/transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY;
  if (!MONO_SECRET_KEY) {
    return res.status(500).json({ error: 'MONO_SECRET_KEY not set in environment.' });
  }
  try {
    // Get all linked accounts for the user
    const user = await User.findById(req.user._id).populate('monoAccounts');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const monoAccounts = user.monoAccounts;
    // Allow maxPages to be set via query param, default 10
    const maxPages = parseInt(req.query.maxPages) || 10;
    // For each account, fetch latest transactions and upsert
    for (const account of monoAccounts) {
      // Use lastSynced for incremental fetch
      let startDate = account.lastSynced ? new Date(account.lastSynced).toISOString() : undefined;
      let transactions = [];
      if (startDate) {
        // Fetch only new transactions since last sync
        function formatDate(date) {
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        }
        let endDate = formatDate(new Date());
        let formattedStart = formatDate(startDate);
        let nextUrl = `${BASE_URL}/accounts/${account.accountId}/transactions?start=${encodeURIComponent(formattedStart)}&end=${encodeURIComponent(endDate)}`;
        let page = 1;
        while (nextUrl && page <= maxPages) {
          const res = await axios.get(nextUrl, { headers: { 'mono-sec-key': MONO_SECRET_KEY } });
          const data = res.data.data || [];
          transactions = transactions.concat(data);
          const meta = res.data.meta || {};
          nextUrl = meta.next || null;
          page++;
        }
      } else {
        // No lastSynced, fetch all as before
        transactions = await fetchAllTransactions(account.accountId, MONO_SECRET_KEY, maxPages);
      }
      for (const tx of transactions) {
        await Transaction.findOneAndUpdate(
          { monoId: tx.id, monoAccount: account._id },
          {
            monoId: tx.id,
            monoAccount: account._id,
            user: user._id,
            narration: tx.narration,
            amount: tx.amount,
            type: tx.type,
            category: tx.category || null,
            currency: tx.currency,
            balance: tx.balance,
            date: tx.date,
            raw: tx
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      // Update lastSynced to now
      account.lastSynced = new Date();
      await account.save();
    }
    // Fetch all transactions for the user, sorted by date desc
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const total = await Transaction.countDocuments({ user: user._id });
    const totalPages = Math.ceil(total / limit);
    const allTransactions = await Transaction.find({ user: user._id })
      .populate('monoAccount')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    res.json({
      transactions: allTransactions,
      page,
      limit,
      total,
      totalPages
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router; 