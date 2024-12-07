import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import Queue from 'bull'; // Import Bull

const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379'); // Create the userQueue

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Check if email is missing
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Check if password is missing
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if user already exists
    const usersCollection = dbClient.db.collection('users');
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash the password using SHA1
    const hashedPassword = sha1(password);

    // Create new user
    const newUser = {
      email,
      password: hashedPassword
    };

    // Insert user into database
    const result = await usersCollection.insertOne(newUser);

    // Add a job to the userQueue with the userId
    await userQueue.add({ userId: result.insertedId });

    // Return user info
    return res.status(201).json({
      id: result.insertedId,
      email: newUser.email
    });
  }

  static async getMe(req, res) {
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

    // Find user in database
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Return user info
    return res.status(200).json({
      id: user._id,
      email: user.email
    });
  }
}

export default UsersController;

