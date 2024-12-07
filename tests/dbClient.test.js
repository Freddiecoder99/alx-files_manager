const { DBClient } = require('../utils/db');
const setup = require('./setup');

describe('DBClient', () => {
  let dbClient;
  let dbConnection;

  beforeAll(async () => {
    dbConnection = await setup.connectDB();
    dbClient = new DBClient();
  });

  afterAll(async () => {
    await setup.clearDatabase(dbConnection);
  });

  test('should create a DB client', () => {
    expect(dbClient).toBeDefined();
  });

  test('should check database connection status', async () => {
    const isConnected = await dbClient.isAlive();
    expect(isConnected).toBe(true);
  });

  test('should get the number of users', async () => {
    // Assuming you have a users collection
    const usersCollection = dbConnection.collection('users');
    await usersCollection.insertMany([
      { email: 'test1@example.com' },
      { email: 'test2@example.com' }
    ]);

    const userCount = await dbClient.nbUsers();
    expect(userCount).toBe(2);
  });

  test('should get the number of files', async () => {
    // Assuming you have a files collection
    const filesCollection = dbConnection.collection('files');
    await filesCollection.insertMany([
      { name: 'file1' },
      { name: 'file2' },
      { name: 'file3' }
    ]);

    const fileCount = await dbClient.nbFiles();
    expect(fileCount).toBe(3);
  });
});

