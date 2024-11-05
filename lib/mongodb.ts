import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local')
}

const uri = process.env.MONGODB_URI as string
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Set up connection and indexes when the client connects
clientPromise
  .then(async client => {
    try {
      console.log('Connected to MongoDB!')
      const db = client.db()

      // Create indexes for better query performance
      await db
        .collection('chats')
        .createIndexes([
          { key: { id: 1 }, unique: true },
          { key: { userId: 1 } },
          { key: { createdAt: -1 } },
          { key: { 'messages.id': 1 } }
        ])

      await db.collection('users').createIndexes([
        { key: { id: 1 }, unique: true },
        { key: { email: 1 }, unique: true }
      ])

      console.log('MongoDB indexes created successfully')
    } catch (error) {
      console.error('Error setting up MongoDB:', error)
    }
  })
  .catch(error => {
    console.error('Error connecting to MongoDB:', error)
  })

// Export a module-scoped MongoClient promise
// By doing this in a separate module, the client can be shared across functions
export default clientPromise

// Helper function to get database instance
export async function getDatabase() {
  const client = await clientPromise
  return client.db()
}

// Helper function to get a specific collection
export async function getCollection(collectionName: string) {
  const db = await getDatabase()
  return db.collection(collectionName)
}

// Error handler for MongoDB operations
export class MongoDBError extends Error {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'MongoDBError'
  }
}

// Connection status checker
export async function checkConnection() {
  try {
    const client = await clientPromise
    await client.db().command({ ping: 1 })
    return true
  } catch (error) {
    console.error('MongoDB connection check failed:', error)
    return false
  }
}
