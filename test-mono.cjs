// Test script for Mono endpoints needed for Wyse integration
// Usage: Set MONO_SECRET_KEY and MONO_ACCOUNT_ID in your environment before running
// Example: MONO_SECRET_KEY=sk_test_xxx MONO_ACCOUNT_ID=account_id node test-mono.js

const axios = require('axios');

const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY;
const MONO_ACCOUNT_ID = process.env.MONO_ACCOUNT_ID;
const MONO_AUTH_CODE = process.env.MONO_AUTH_CODE;
const API_BASE = 'https://api.withmono.com/v2';

if (!MONO_SECRET_KEY) {
  console.error('Error: Please set MONO_SECRET_KEY in your environment.');
  process.exit(1);
}
if (!MONO_ACCOUNT_ID && !MONO_AUTH_CODE) {
  console.error('Error: Please set MONO_ACCOUNT_ID or MONO_AUTH_CODE in your environment.');
  process.exit(1);
}

const headers = {
  'mono-sec-key': MONO_SECRET_KEY,
  'Content-Type': 'application/json',
};

async function testMonoEndpoints() {
  try {
    // 1. Get Account Information
    const accountInfo = await axios.get(`${API_BASE}/accounts/${MONO_ACCOUNT_ID}`, { headers });
    console.log('\n=== Account Information ===');
    console.dir(accountInfo.data, { depth: null });

    // 2. Get Transactions
    const transactions = await axios.get(`${API_BASE}/accounts/${MONO_ACCOUNT_ID}/transactions`, { headers });
    console.log('\n=== Transactions ===');
    console.dir(transactions.data, { depth: null });

    // 3. Get Income
    const income = await axios.get(`${API_BASE}/accounts/${MONO_ACCOUNT_ID}/income`, { headers });
    console.log('\n=== Income ===');
    console.dir(income.data, { depth: null });

    // 4. Get Identity
    const identity = await axios.get(`${API_BASE}/accounts/${MONO_ACCOUNT_ID}/identity`, { headers });
    console.log('\n=== Identity ===');
    console.dir(identity.data, { depth: null });

    // 5. Get Institutions (for bank list)
    const institutions = await axios.get(`${API_BASE}/coverage`, { headers });
    console.log('\n=== Institutions ===');
    console.dir(institutions.data, { depth: null });

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

testMonoEndpoints(); 