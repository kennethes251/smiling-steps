/**
 * Feedback Model Unit Tests
 * Tests for rating validation (1-5)
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Feedback = require('../models/Feedback');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Helper to create valid feedback data
const createValidFeedbackData = (overrides = {}) => ({
  session: new mongoose.Types.ObjectId(),
  client: new mongoose.Types.ObjectId(),
  psychologist: new mongoose.Types.ObjectId(),
  rating: 5,
  comment: 'Great session!',
  ...overrides,
});

describe('Feedback Model - Rating Validation', () => {

  describe('Valid ratings (1-5)', () => {
    test.each([1, 2, 3, 4, 5])('should accept rating of %i', async (rating) => {
      const feedbackData = createValidFeedbackData({ rating });
      const feedback = new Feedback(feedbackData);
      const savedFeedback = await feedback.save();
      
      expect(savedFeedback.rating).toBe(rating);
    });
  });

  describe('Invalid ratings', () => {
    test('should reject rating of 0', async () => {
      const feedbackData = createValidFeedbackData({ rating: 0 });
      const feedback = new Feedback(feedbackData);
      
      await expect(feedback.save()).rejects.toThrow();
    });

    test('should reject rating of 6', async () => {
      const feedbackData = createValidFeedbackData({ rating: 6 });
      const feedback = new Feedback(feedbackData);
      
      await expect(feedback.save()).rejects.toThrow();
    });

    test('should reject negative rating', async () => {
      const feedbackData = createValidFeedbackData({ rating: -1 });
      const feedback = new Feedback(feedbackData);
      
      await expect(feedback.save()).rejects.toThrow();
    });

    test('should reject rating greater than 5', async () => {
      const feedbackData = createValidFeedbackData({ rating: 10 });
      const feedback = new Feedback(feedbackData);
      
      await expect(feedback.save()).rejects.toThrow();
    });

    test('should reject missing rating', async () => {
      const feedbackData = createValidFeedbackData();
      delete feedbackData.rating;
      const feedback = new Feedback(feedbackData);
      
      await expect(feedback.save()).rejects.toThrow();
    });
  });

  describe('Rating validation error messages', () => {
    test('should provide validation error for rating below minimum', async () => {
      const feedbackData = createValidFeedbackData({ rating: 0 });
      const feedback = new Feedback(feedbackData);
      
      let error;
      try {
        await feedback.save();
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.rating).toBeDefined();
    });

    test('should provide validation error for rating above maximum', async () => {
      const feedbackData = createValidFeedbackData({ rating: 6 });
      const feedback = new Feedback(feedbackData);
      
      let error;
      try {
        await feedback.save();
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.rating).toBeDefined();
    });
  });
});


describe('Feedback Model - Unique Constraint', () => {
  test('should allow feedback for different sessions', async () => {
    const session1 = new mongoose.Types.ObjectId();
    const session2 = new mongoose.Types.ObjectId();
    const client = new mongoose.Types.ObjectId();
    const psychologist = new mongoose.Types.ObjectId();

    const feedback1 = new Feedback({
      session: session1,
      client,
      psychologist,
      rating: 5,
      comment: 'First session feedback',
    });
    await feedback1.save();

    const feedback2 = new Feedback({
      session: session2,
      client,
      psychologist,
      rating: 4,
      comment: 'Second session feedback',
    });
    const savedFeedback2 = await feedback2.save();

    expect(savedFeedback2.session.toString()).toBe(session2.toString());
  });

  test('should reject duplicate feedback for the same session', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const client = new mongoose.Types.ObjectId();
    const psychologist = new mongoose.Types.ObjectId();

    // Create first feedback
    const feedback1 = new Feedback({
      session: sessionId,
      client,
      psychologist,
      rating: 5,
      comment: 'First feedback',
    });
    await feedback1.save();

    // Try to create duplicate feedback for same session
    const feedback2 = new Feedback({
      session: sessionId,
      client,
      psychologist,
      rating: 3,
      comment: 'Duplicate feedback',
    });

    await expect(feedback2.save()).rejects.toThrow();
  });

  test('should reject duplicate with MongoDB duplicate key error', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const client = new mongoose.Types.ObjectId();
    const psychologist = new mongoose.Types.ObjectId();

    // Create first feedback
    const feedback1 = new Feedback({
      session: sessionId,
      client,
      psychologist,
      rating: 5,
    });
    await feedback1.save();

    // Try to create duplicate
    const feedback2 = new Feedback({
      session: sessionId,
      client,
      psychologist,
      rating: 4,
    });

    let error;
    try {
      await feedback2.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    // MongoDB duplicate key error code is 11000
    expect(error.code).toBe(11000);
  });
});
