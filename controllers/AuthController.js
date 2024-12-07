import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    // Get Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode Base64 credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');

    // Validate credentials
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Hash password and find user
    const hashedPassword = sha1(password);
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ 
      email, 
      password: hashedPassword 
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate token
    const token = uuidv4();
    const key = `auth_${token}`;

    // Store token in Redis for 24 hours
    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    // Get token from header
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if token exists in Redis
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete token from Redis
    await redisClient.del(key);

    return res.status(204).send();
  }
}

export default AuthController;
