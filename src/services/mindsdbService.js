import axios from 'axios';
import { Types } from 'mongoose';

class MindsDBService {
  constructor() {
    this.baseURL = `http://${process.env.MINDSDB_HOST || 'localhost'}:${process.env.MINDSDB_PORT || 47334}`;
    this.isConnected = false;
    this.defaultEngine = process.env.MINDSDB_DEFAULT_ENGINE || 'openai';
  }

  // Helper for per-user naming
  getUserKnowledgeBaseName(userId) {
    return `wyse_transactions_${userId.toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
  getUserAiTableName(userId) {
    return `wyse_ai_table_${userId.toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
  getUserAgentName(userId) {
    return `wyse_agent_${userId.toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  // Connection management for MindsDB
  async connect() {
    try {
      await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
      this.isConnected = true;
      console.log('MindsDB connected successfully');
      return true;
    } catch (error) {
      console.error('MindsDB connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }
  async ensureConnection() {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('MindsDB is not available. Please ensure MindsDB is running on the configured port.');
      }
    }
  }

  // Execute a SQL query against MindsDB
  async executeSQL(query) {
    try {
      const response = await axios.post(`${this.baseURL}/api/sql/query`, { query }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      try {
        const response = await axios.post(`${this.baseURL}/sql`, { query }, {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
      } catch (secondError) {
        console.error('SQL execution error:', error.response?.data || error.message);
        console.error('Alternative endpoint also failed:', secondError.response?.data || secondError.message);
        throw error;
      }
    }
  }
  async disconnect() {
    this.isConnected = false;
    console.log('MindsDB disconnected');
  }

  // Create a knowledge base for a user if it doesn't exist
  async createKnowledgeBase(userId, engine = 'gemini', autoBackfill = false) {
    await this.ensureConnection();
    const knowledgeBaseName = this.getUserKnowledgeBaseName(userId);
    const sql = `SHOW KNOWLEDGE_BASES LIKE '${knowledgeBaseName}';`;
    const exists = await this.executeSQL(sql);
    if (exists?.data && exists.data.length > 0) return { success: true, exists: true, knowledgeBaseName };
    const apiKey = process.env.GEMINI_API_KEY;
    const createSql = `
      CREATE KNOWLEDGE_BASE ${knowledgeBaseName}
      USING
        embedding_model = {"provider": "gemini", "model_name": "text-embedding-004", "api_key": "${apiKey}"},
        metadata_columns = ['user_id', 'transaction_date', 'amount', 'type', 'category', 'currency', 'account_id', 'institution_name'],
        content_columns = ['transaction_description'],
        id_column = 'transaction_id';
    `;
    await this.executeSQL(createSql);
    // Always create an index for better search performance
    const indexSql = `CREATE INDEX ON KNOWLEDGE_BASE ${knowledgeBaseName};`;
    await this.executeSQL(indexSql);
    return { success: true, created: true, knowledgeBaseName };
  }

  // Create an AI Table for a user if it doesn't exist
  async createUserAiTable(userId) {
    await this.ensureConnection();
    const aiTableName = this.getUserAiTableName(userId);
    const checkSql = `SHOW TABLES LIKE '${aiTableName}';`;
    const checkRes = await this.executeSQL(checkSql);
    if (checkRes?.data && checkRes.data.length > 0) return { success: true, exists: true, aiTableName };
    const apiKey = process.env.GEMINI_API_KEY;
    const createSql = `
      CREATE AI TABLE ${aiTableName}
      USING
        engine = 'gemini',
        model_name = 'gemini-2.0-flash-lite',
        api_key = '${apiKey}',
        input_columns = ['question', 'context'],
        output_column = 'answer';
    `;
    await this.executeSQL(createSql);
    return { success: true, created: true, aiTableName };
  }

  // Create an Agent for a user if it doesn't exist
  async createUserAgent(userId) {
    await this.ensureConnection();
    const agentName = this.getUserAgentName(userId);
    const kbName = this.getUserKnowledgeBaseName(userId);
    const aiTableName = this.getUserAiTableName(userId);
    const checkSql = `SHOW AGENTS LIKE '${agentName}';`;
    const checkRes = await this.executeSQL(checkSql);
    if (checkRes?.data && checkRes.data.length > 0) return { success: true, exists: true, agentName };
    const apiKey = process.env.GEMINI_API_KEY;
    const createSql = `
      CREATE AGENT ${agentName}
      USING
        model = 'gemini-2.0-flash',
        google_api_key = '${apiKey}',
        include_knowledge_bases = ['${kbName}'],
        include_tables = ['${aiTableName}'],
        prompt_template = 'The knowledge base ${kbName} contains user transaction data. The AI table ${aiTableName} can answer questions, summarize, or classify transactions. Answer user questions using all available data.';
    `;
    await this.executeSQL(createSql);
    return { success: true, created: true, agentName };
  }

  // Query the Agent for a user's question
  async queryAgent(userId, question) {
    await this.ensureConnection();
    const agentName = this.getUserAgentName(userId);
    await this.createKnowledgeBase(userId, 'gemini', false);
    await this.createUserAiTable(userId);
    await this.createUserAgent(userId);
    const sql = `SELECT answer FROM ${agentName} WHERE question = '${question.replace(/'/g, "''")}';`;
    const res = await this.executeSQL(sql);
    if (res?.data && res.data.length > 0) {
      return { success: true, answer: res.data[0][0] };
    }
    return { success: false, message: 'No answer returned by agent.' };
  }

  // Create a background job to sync MongoDB transactions to the user's knowledge base
  async createUserSyncJob(userId) {
    await this.ensureConnection();
    const kbName = this.getUserKnowledgeBaseName(userId);
    const jobName = `wyse_sync_job_${userId.toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
    // Only create the job if it doesn't already exist
    const checkSql = `SHOW JOBS WHERE name = '${jobName}';`;
    const checkRes = await this.executeSQL(checkSql);
    if (checkRes?.data && checkRes.data.length > 0) return { success: true, exists: true, jobName };
    // This job keeps the knowledge base in sync with new transactions
    const createSql = `
      CREATE JOB ${jobName} AS (
        INSERT INTO ${kbName}
        SELECT
          monoId AS transaction_id,
          narration AS transaction_description,
          user AS user_id,
          date AS transaction_date,
          amount,
          type,
          category,
          currency,
          monoAccount AS account_id,
          institutionName AS institution_name
        FROM mongo_conn.transactions
        WHERE user = '${userId}' AND date > LAST
      ) EVERY 10 minutes;
    `;
    await this.executeSQL(createSql);
    return { success: true, created: true, jobName };
  }

  // Insert a single transaction into the user's knowledge base
  async insertTransaction({ narration, amount, type, category, currency, date, userId, accountId, institutionName }) {
    await this.ensureConnection();
    const kbName = this.getUserKnowledgeBaseName(userId);
    const sql = `INSERT INTO ${kbName} (
      transaction_id, transaction_description, user_id, transaction_date, amount, type, category, currency, account_id, institution_name
    ) VALUES (
      '${Types.ObjectId().toString()}',
      '${(narration || '').replace(/'/g, "''")}',
      '${userId}',
      '${date instanceof Date ? date.toISOString() : date}',
      ${amount},
      '${type}',
      '${category}',
      '${currency}',
      '${accountId}',
      '${(institutionName || '').replace(/'/g, "''")}'
    );`;
    await this.executeSQL(sql);
    return { success: true };
  }

  // Evaluate the user's knowledge base for relevancy and accuracy
  async evaluateKnowledgeBase(userId) {
    await this.ensureConnection();
    const kbName = this.getUserKnowledgeBaseName(userId);
    const sql = `EVALUATE KNOWLEDGE_BASE ${kbName};`;
    const res = await this.executeSQL(sql);
    return res;
  }

  // Query transactions in the user's knowledge base using semantic search and optional metadata filters
  async queryTransactions(userId, query, options = {}) {
    await this.ensureConnection();
    const kbName = this.getUserKnowledgeBaseName(userId);
    let whereClauses = [`content LIKE '${query.replace(/'/g, "''")}'`];
    if (options.category) whereClauses.push(`category = '${options.category.replace(/'/g, "''")}'`);
    if (options.type) whereClauses.push(`type = '${options.type.replace(/'/g, "''")}'`);
    if (options.currency) whereClauses.push(`currency = '${options.currency.replace(/'/g, "''")}'`);
    if (options.startDate) whereClauses.push(`transaction_date >= '${options.startDate}'`);
    if (options.endDate) whereClauses.push(`transaction_date <= '${options.endDate}'`);
    const sql = `SELECT * FROM ${kbName} WHERE ${whereClauses.join(' AND ')} ORDER BY similarity DESC LIMIT 20;`;
    const res = await this.executeSQL(sql);
    return res?.data || [];
  }
}

const mindsdbService = new MindsDBService();
export default mindsdbService; 