import mongoose from 'mongoose';
import { connectToDatabase } from '../mongodb';

// Define the User schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    index: true, // Add index for faster queries
  },
  password: {
    type: String,
    // Not required for OAuth users
  },
  image: {
    type: String,
  },
  provider: {
    type: String,
    default: 'credentials',
    enum: ['credentials', 'google', 'github'], // Restrict to valid providers
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  dateOfBirth: {
    type: Date,
    // Optional field
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create or get the User model
export const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Helper function to create or update a user
export async function upsertUser(userData: {
  email: string;
  name?: string;
  image?: string;
  provider?: string;
  password?: string;
  dateOfBirth?: Date | string;
  isAdmin?: boolean;
}) {
  try {
    console.log('Attempting to upsert user:', userData.email);
    
    // Connect to MongoDB using our improved connection utility
    const connection = await connectToDatabase();
    if (!connection) {
      console.error('Failed to connect to MongoDB - connection is null');
      throw new Error('MongoDB connection failed');
    }
    
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    
    // Validate required fields
    if (!userData.email) {
      throw new Error('Email is required for user creation');
    }
    
    // Set default values for missing fields
    const userToSave = {
      ...userData,
      name: userData.name || 'Unknown User',
      provider: userData.provider || 'credentials',
      lastLogin: new Date(),
      updatedAt: new Date(),
    };
    
    // Find user by email or create a new one
    console.log('Finding or creating user in MongoDB...');
    console.log('User data to save:', JSON.stringify(userToSave, null, 2));
    
    const user = await User.findOneAndUpdate(
      { email: userData.email },
      {
        $set: {
          ...userToSave,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        new: true,        // Return the updated document
        upsert: true,     // Create if it doesn't exist
        runValidators: true, // Run schema validators
      }
    );
    
    if (!user) {
      console.error('User upsert failed - no user returned');
      throw new Error('User upsert failed');
    }
    
    console.log('User upserted successfully:', user._id);
    console.log('User data saved:', JSON.stringify(user.toObject(), null, 2));
    
    // Return a plain object (not a Mongoose document)
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error('Error in upsertUser function:', error);
    throw error;
  }
}

// Helper function to get all users (for admin dashboard)
export async function getAllUsers() {
  try {
    console.log('Getting all users from MongoDB...');
    
    // Connect to MongoDB
    const connection = await connectToDatabase();
    if (!connection) {
      console.warn('No MongoDB connection available, returning empty user list');
      return [];
    }
    
    // Verify User model is registered
    if (!mongoose.models.User) {
      console.error('User model is not registered');
      return [];
    }
    
    // Find all users, excluding password field
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).lean();
    console.log(`Found ${users.length} users in database`);
    
    // Return empty array if no users found
    if (!users || users.length === 0) {
      console.log('No users found in database');
      return [];
    }
    
    // Convert Mongoose documents to plain objects
    return JSON.parse(JSON.stringify(users));
  } catch (error) {
    console.error('Error getting all users:', error);
    // Return empty array instead of throwing
    return [];
  }
}

// Helper function to get a user by email
export async function getUserByEmail(email: string) {
  try {
    console.log('Getting user by email:', email);
    
    // Connect to MongoDB
    const connection = await connectToDatabase();
    if (!connection) {
      console.warn('No MongoDB connection available, cannot get user');
      return null;
    }
    
    // Find user by email, excluding password
    const user = await User.findOne({ email }, { password: 0 }).lean();
    
    if (!user) {
      console.log('User not found:', email);
      return null;
    }
    
    // Safe access to _id with type checking
    console.log('User found:', user && '_id' in user ? user._id : 'unknown id');
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null; // Return null instead of throwing
  }
}
