const { RedisClient } = require('../utils/redis');
const setup = require('./setup');

describe('RedisClient', () => {
  let redisClient;
  let redisConnection;

  beforeAll(async () => {
    redisConnection = await setup.connectRedis();
    redisClient = new RedisClient();
  });

  afterAll(async () => {
    await setup.clearRedis(redisConnection);
    await redisConnection.quit();
  });

  test('should create a Redis client', () => {
    expect(redisClient).toBeDefined();
  });

  test('should check Redis connection status', async () => {
    const isConnected = await redisClient.isAlive();
    expect(isConnected).toBe(true);
  });

  test('should set and get a value', async () => {
    await redisClient.set('testKey', 'testValue', 10);
    const value = await redisClient.get('testKey');
    expect(value).toBe('testValue');
  });

  test('should delete a key', async () => {
    await redisClient.set('deleteKey', 'deleteValue', 10);
    await redisClient.del('deleteKey');
    const value = await redisClient.get('deleteKey');
    expect(value).toBeNull();
  });
});

