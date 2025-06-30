const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json());

app.use(cors());

// Mono exchange code endpoint (test only)
app.post('/api/mono/exchange-code', async (req, res) => {
  const { code } = req.body;
  console.log(code);
  const MONO_SECRET_KEY = 'test_sk_qxx31o7m0h8uzkjoe0e0';
  if (!MONO_SECRET_KEY) {
    return res.status(500).json({ error: 'MONO_SECRET_KEY not set in environment.' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing code in request body.' });
  }
  try {
    // Exchange code for accountId
    const response = await axios.post(
      'https://api.withmono.com/v2/accounts/auth',
      { code },
      { headers: { 'mono-sec-key': MONO_SECRET_KEY, 'Content-Type': 'application/json' } }
    );
    console.log(response.data);
    const accountId = response.data.data.id;
    res.json({ accountId });

    // Run the test script with the new accountId
    const outputFile = __dirname + '/mono-test-output.txt';
    const cmd = `$env:MONO_SECRET_KEY=\"${MONO_SECRET_KEY}\"; $env:MONO_ACCOUNT_ID=\"${accountId}\"; node test-mono.cjs`;
    exec(cmd, { cwd: __dirname, shell: 'powershell.exe' }, (error, stdout, stderr) => {
      let output = '--- Mono Test Script Output ---\n';
      if (error) {
        output += 'Error running test-mono.cjs: ' + error + '\n';
      }
      if (stdout) output += stdout + '\n';
      if (stderr) output += stderr + '\n';
      output += '--- End Mono Test Script Output ---\n';
      fs.writeFileSync(outputFile, output, { encoding: 'utf8' });
    });
  } catch (err) {
    console.log(err.response?.data || err.message);
    if (err.response) {
      res.status(err.response.status).json({ error: err.response.data });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Endpoint to fetch real account info and transactions for the dashboard
app.get('/api/mono/account-data', async (req, res) => {
  const accountId = req.query.accountId;
  const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY || 'test_sk_qxx31o7m0h8uzkjoe0e0';
  if (!accountId) {
    return res.status(400).json({ error: 'Missing accountId query parameter.' });
  }
  try {
    // Fetch account info
    const accountInfoRes = await axios.get(`https://api.withmono.com/v2/accounts/${accountId}`, {
      headers: { 'mono-sec-key': MONO_SECRET_KEY }
    });
    // Fetch transactions
    const transactionsRes = await axios.get(`https://api.withmono.com/v2/accounts/${accountId}/transactions`, {
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

const PORT = process.env.TEST_SERVER_PORT || 4001;
app.listen(PORT, () => {
  console.log(`Mono test server running on port ${PORT}`);
}); 