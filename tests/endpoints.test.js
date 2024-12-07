const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../server');
const setup = require('./setup');

describe('API Endpoints', () => {
  let dbConnection;
  let redisConnection;
  let authToken;
  let userId;
  let fileId;

  beforeAll(async () => {
    dbConnection = await setup.connectDB();
    redisConnection = await setup.connectRedis();
  });

  afterAll(async () => {
    await setup.clearDatabase(dbConnection);
    await setup.clearRedis(redisConnection);
    await redisConnection.quit();
  });

  // Status Endpoint
  describe('GET /status', () => {
    test('should return correct status', async () => {
      const response = await request(app).get('/status');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        redis: true,
        db: true
      });
    });
  });

  // Stats Endpoint
  describe('GET /stats', () => {
    test('should return user and file stats', async () => {
      const response = await request(app).get('/stats');
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('files');
    });
  });

  // User Creation and Authentication
  describe('POST /users', () => {
    test('should create a new user', async () => {
      const userData = {
        email: `test${uuidv4()}@example.com`,
        password: 'testpassword'
      };

      const response = await request(app)
        .post('/users')
        .send(userData);
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', userData.email);
      
      userId = response.body.id;
    });

    test('should not create user with existing email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'testpassword'
      };

      // First create
      await request(app).post('/users').send(userData);

      // Try to create again
      const response = await request(app)
        .post('/users')
        .send(userData);
      
      expect(response.statusCode).toBe(400);
    });
  });

  // Connect and Disconnect
  describe('Authentication Flow', () => {
    let loginCredentials;

    beforeEach(async () => {
      loginCredentials = {
        email: `login${uuidv4()}@example.com`,
        password: 'loginpassword'
      };

      // Create user first
      await request(app).post('/users').send(loginCredentials);
    });

    test('GET /connect should authenticate user', async () => {
      const response = await request(app)
        .get('/connect')
        .auth(loginCredentials.email, loginCredentials.password);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      authToken = response.body.token;
    });

    test('GET /disconnect should log out user', async () => {
      // First connect
      const connectResponse = await request(app)
        .get('/connect')
        .auth(loginCredentials.email, loginCredentials.password);
      
      const token = connectResponse.body.token;

      // Then disconnect
      const response = await request(app)
        .get('/disconnect')
        .set('X-Token', token);
      
      expect(response.statusCode).toBe(204);
    });
  });

  // User Profile
  describe('GET /users/me', () => {
    test('should retrieve user profile', async () => {
      // First connect to get token
      const connectResponse = await request(app)
        .get('/connect')
        .auth(loginCredentials.email, loginCredentials.password);
      
      const token = connectResponse.body.token;

      // Get user profile
      const response = await request(app)
        .get('/users/me')
        .set('X-Token', token);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('email', loginCredentials.email);
    });
  });

  // File Management
  describe('File Endpoints', () => {
    let fileData;
    let token;

    beforeEach(async () => {
      // Authenticate and get token
      const connectResponse = await request(app)
        .get('/connect')
        .auth(loginCredentials.email, loginCredentials.password);
      
      token = connectResponse.body.token;

      // Prepare file data
      fileData = {
        name: 'testfile.txt',
        type: 'file',
        data: Buffer.from('test content').toString('base64'),
        isPublic: false
      };
    });

    test('POST /files should create a file', async () => {
      const response = await request(app)
        .post('/files')
        .set('X-Token', token)
        .send(fileData);
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(fileData.name);
      
      fileId = response.body.id;
    });

    test('GET /files/:id should retrieve a specific file', async () => {
      const response = await request(app)
        .get(`/files/${fileId}`)
        .set('X-Token', token);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(fileId);
    });

    test('GET /files should list files with pagination', async () => {
      // Create multiple files
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/files')
          .set('X-Token', token)
          .send({
            ...fileData,
            name: `testfile${i}.txt`
          });
      }

      // Test first page (default pagination)
      const response1 = await request(app)
        .get('/files')
        .set('X-Token', token);
      
      expect(response1.statusCode).toBe(200);
      expect(response1.body.length).toBe(10); // Default page size

      // Test second page
      const response2 = await request(app)
        .get('/files?page=1')
        .set('X-Token', token);
      
      expect(response2.statusCode).toBe(200);
      expect(response2.body.length).toBe(5); // Remaining files
    });

    test('PUT /files/:id/publish should publish a file', async () => {
      const response = await request(app)
        .put(`/files/${fileId}/publish`)
        .set('X-Token', token);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.isPublic).toBe(true);
    });

    test('PUT /files/:id/unpublish should unpublish a file', async () => {
      const response = await request(app)
        .put(`/files/${fileId}/unpublish`)
        .set('X-Token', token);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.isPublic).toBe(false);
    });

    test('GET /files/:id/data should retrieve file data', async () => {
      const response = await request(app)
        .get(`/files/${fileId}/data`)
        .set('X-Token', token);
      
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('test content');
    });
  });
});
