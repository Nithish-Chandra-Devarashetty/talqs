import { MongoClient, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';

// Default MongoDB URI for development (will be overridden by env variable if present)
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/TALQSSSS';

// Get MongoDB URI from environment or use default
const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

// Log connection attempt
console.log('Initializing MongoDB connection...');

// Log the URI for debugging (hide sensitive parts if present)
let maskedUri = uri;
if (uri.includes('@')) {
  maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}
console.log('MongoDB URI (masked):', maskedUri);

// Define MongoDB client options
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 10000, // Increased timeout to 10s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  connectTimeoutMS: 10000, // Connection timeout
  retryWrites: true,
};

// Define Mongoose connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  autoIndex: true,
  autoCreate: true,
};

// MongoDB Client (for native MongoDB operations)
let mongoClientPromise: Promise<MongoClient>;

// Cache the MongoDB connection
let cachedConnection: mongoose.Connection | null = null;
let connectionPromise: Promise<mongoose.Connection | null> | null = null;

// Mongoose connection (for Mongoose ORM)
export async function connectToDatabase() {
  // If we already have a connection, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }
  
  // If a connection attempt is already in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }
  
  // Create a new connection promise
  connectionPromise = (async () => {
    try {
      console.log('Connecting to MongoDB...');
      console.log('Current connection state:', mongoose.connection.readyState);
      
      // Force mongoose to use native promises
      mongoose.Promise = global.Promise;
      
      // Disconnect if there's a stale connection
      if (mongoose.connection.readyState !== 0) {
        console.log('Closing existing connection...');
        await mongoose.disconnect();
      }
      
      // Try primary URI first
      try {
        console.log('Attempting connection with URI:', maskedUri);
        await mongoose.connect(uri, mongooseOptions);
        
        console.log('✅ MongoDB connected successfully via Mongoose');
        console.log('Connection state:', mongoose.connection.readyState);
        console.log('Database name:', mongoose.connection.name);
        
        // Cache the connection
        cachedConnection = mongoose.connection;
        return mongoose.connection;
      } catch (primaryError) {
        console.error('Failed to connect with primary URI:', primaryError);
        
        // If the primary URI is already the default, don't try again
        if (uri === DEFAULT_MONGODB_URI) {
          throw primaryError;
        }
        
        // Try with localhost explicitly as fallback
        try {
          console.log('Attempting fallback connection with localhost...');
          await mongoose.connect(DEFAULT_MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
          });
          
          console.log('✅ MongoDB connected successfully via localhost fallback');
          cachedConnection = mongoose.connection;
          return mongoose.connection;
        } catch (localError) {
          console.error('Failed to connect with localhost fallback:', localError);
          throw primaryError; // Throw the original error
        }
      }
    } catch (error) {
      console.error('❌ All MongoDB connection attempts failed:', error);
      
      // Reset connection promise so we can try again
      connectionPromise = null;
      
      if (process.env.NODE_ENV === 'development') {
        // In development, we can return null to allow the app to function
        console.warn('⚠️ Using mock connection for development');
        return null;
      } else {
        // In production, we should fail
        throw error;
      }
    }
  })();
  
  return connectionPromise;
}

// Create MongoDB client with fallback options
const createMongoClient = () => {
  try {
    console.log('Creating MongoDB client...');
    const client = new MongoClient(uri, options);
    return client.connect()
      .then(client => {
        console.log('✅ MongoDB client connected successfully');
        return client;
      })
      .catch(err => {
        console.error('Error connecting MongoDB client:', err);
        
        // If the primary URI is already the default, don't try again
        if (uri === DEFAULT_MONGODB_URI) {
          throw err;
        }
        
        // Try with localhost as fallback
        console.log('Attempting connection with localhost fallback...');
        const localOptions: MongoClientOptions = {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 30000,
        };
        const localClient = new MongoClient(DEFAULT_MONGODB_URI, localOptions);
        return localClient.connect()
          .then(client => {
            console.log('✅ MongoDB client connected successfully via localhost fallback');
            return client;
          })
          .catch(localErr => {
            console.error('❌ All MongoDB client connection attempts failed:', localErr);
            throw err; // Throw the original error
          });
      });
  } catch (error) {
    console.error('Error creating MongoDB client:', error);
    throw error;
  }
};

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = createMongoClient();
  }
  mongoClientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  mongoClientPromise = createMongoClient();
}

// Export the client promise for NextAuth and other components
export { mongoClientPromise as clientPromise };