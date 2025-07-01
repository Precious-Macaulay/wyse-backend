import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import mindsdbService from '../services/mindsdbService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

const ai = new GoogleGenAI({});

/**
 * POST /api/ai/query-transactions
 * Query transactions using natural language and optional filters
 * Private route
 */
router.post('/query-transactions', authenticateToken, asyncHandler(async (req, res) => {
  const { query, options = {} } = req.body;
  const userId = req.user._id;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: 'Invalid query',
      message: 'Query must be a non-empty string'
    });
  }

  try {
    // Ensure knowledge base exists for this user
    await mindsdbService.createKnowledgeBase(userId);

    // Query the knowledge base (implement queryTransactions in service if not present)
    const results = await mindsdbService.queryTransactions(userId, query, options);

    // Format results for frontend
    const formattedResults = results.map(result => {
      const metadata = JSON.parse(result.metadata_columns);
      return {
        content: result.content,
        narration: metadata.narration || result.content,
        amount: metadata.amount,
        type: metadata.type,
        category: metadata.category,
        currency: metadata.currency,
        date: metadata.date,
        institutionName: metadata.institutionName,
        similarity: result.similarity
      };
    });

    res.json({
      success: true,
      query: query,
      results: formattedResults,
      totalResults: formattedResults.length
    });

  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({
      error: 'Failed to process query',
      message: 'Please try again later'
    });
  }
}));

/**
 * POST /api/ai/chat
 * AI chat with transaction context (now LLM-powered with Gemini Agent)
 * Private route
 */
router.post('/chat', authenticateToken, asyncHandler(async (req, res) => {
  const { message } = req.body;
  const userId = req.user._id;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Invalid message',
      message: 'Message must be a non-empty string'
    });
  }

  try {
    const result = await mindsdbService.queryAgent(userId, message);
    if (!result.success || !result.answer) {
      return res.json({
        success: true,
        response: {
          type: 'text',
          content: "I couldn't find any transactions matching your query. Try rephrasing or check if you have any transactions in that category."
        },
        query: message
      });
    }
    res.json({
      success: true,
      response: {
        type: 'text',
        content: result.answer
      },
      query: message
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: 'Please try again later'
    });
  }
}));

/**
 * GET /api/ai/engines
 * Get available AI engines
 * Private route
 */
router.get('/engines', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const engines = await mindsdbService.getAvailableEngines();
    
    res.json({
      success: true,
      engines: engines,
      currentEngine: mindsdbService.defaultEngine
    });
  } catch (error) {
    console.error('Get engines error:', error);
    res.status(500).json({
      error: 'Failed to get available engines',
      message: 'Please try again later'
    });
  }
}));

/**
 * POST /api/ai/switch-engine
 * Switch to a different AI engine
 * Private route
 */
router.post('/switch-engine', authenticateToken, asyncHandler(async (req, res) => {
  const { engine } = req.body;

  if (!engine || !['openai', 'gemini'].includes(engine)) {
    return res.status(400).json({
      error: 'Invalid engine',
      message: 'Engine must be either "openai" or "gemini"'
    });
  }

  try {
    const result = await mindsdbService.switchEngine(req.user._id, engine);
    
    res.json({
      success: true,
      message: `Successfully switched to ${engine} engine`,
      engine: engine,
      result: result
    });
  } catch (error) {
    console.error('Switch engine error:', error);
    res.status(500).json({
      error: 'Failed to switch engine',
      message: error.message || 'Please try again later'
    });
  }
}));

/**
 * GET /api/ai/evaluate
 * Evaluate the user's knowledge base for relevancy and accuracy
 * Private route (admin only)
 */
router.get('/evaluate', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  try {
    const evaluation = await mindsdbService.evaluateKnowledgeBase(userId);
    res.json({
      success: true,
      evaluation: evaluation
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      error: 'Failed to evaluate knowledge base',
      message: 'Please try again later'
    });
  }
}));

/**
 * POST /api/ai/setup
 * Initialize MindsDB knowledge base and jobs
 * Private route (admin only)
 */
router.post('/setup', authenticateToken, asyncHandler(async (req, res) => {
  const { engine } = req.body;
  
  try {
    // Create knowledge base with specified engine or default
    const result = await mindsdbService.createKnowledgeBase(req.user._id, engine);
    
    // Create sync job (optional)
    try {
      await mindsdbService.createJobForSync();
    } catch (jobError) {
      console.warn('Failed to create sync job:', jobError);
    }

    res.json({
      success: true,
      message: 'MindsDB setup completed successfully',
      engine: result.engine,
      result: result
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({
      error: 'Failed to setup MindsDB',
      message: error.message
    });
  }
}));

/**
 * POST /api/ai/llm-table-answer
 * Get Gemini-powered LLM answers over transactions using AI Table
 * Private route
 */
router.post('/llm-table-answer', authenticateToken, asyncHandler(async (req, res) => {
  const { question, options = {} } = req.body;
  const userId = req.user._id;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({
      error: 'Invalid question',
      message: 'Question must be a non-empty string'
    });
  }

  try {
    const result = await mindsdbService.queryAiTableWithKb(userId, question, options);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('LLM Table Answer error:', error);
    res.status(500).json({
      error: 'Failed to get LLM Table answer',
      message: error.message || 'Please try again later'
    });
  }
}));

export default router; 