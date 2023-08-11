
import { MongoClient, ObjectId } from 'mongodb';

async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    return client.db();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    return null; // return null if an error occurs
  }
}

export { connectToDatabase, ObjectId };
