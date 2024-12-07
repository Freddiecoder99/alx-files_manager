const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const app = require('../server'); // Adjust the path to your main server file

// Global setup for tests
global.testMongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/files_manager_test';
global.testRedisPort = process.env.REDIS_TEST_PORT || 6379;

// Helper functions for test setup and teardown
module.exports = {
  async connectDB() {
    const client = await MongoClient.connect(global.testMongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    return client.db();
  },

  async connectRedis() {
    const redis = new Redis({
      port: global.testRedisPort,
      host: 'localhost',
    });
    return redis;
  },

  async clearDatabase(db) {
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  },

  async clearRedis(redis) {
    await redis.flushall();
  },
};

