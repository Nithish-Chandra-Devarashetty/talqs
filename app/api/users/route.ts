import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/models/User';
import { connectToDatabase } from '@/lib/mongodb';

// Access the in-memory store from the signup API
let devUsers: any[] = [];
try {
  // Try to import the devUsers from the signup API
  const signupModule = require('../auth/signup/route');
  if (signupModule && 'devUsers' in signupModule) {
    devUsers = signupModule.devUsers;
  }
} catch (error) {
  console.warn('Could not import devUsers from signup API:', error);
}

export async function GET(req: NextRequest) {
  console.log('API: Getting all users');
  
  try {
    // Try to get users from MongoDB first
    let users = [];
    let fromDevStore = false;
    
    try {
      // First ensure MongoDB is connected
      const connection = await connectToDatabase();
      if (connection) {
        // Use the getAllUsers function from the User model
        users = await getAllUsers();
        console.log(`API: Found ${users.length} users in MongoDB`);
      } else {
        console.warn('API: MongoDB connection not available');
      }
    } catch (dbError) {
      console.error('API: MongoDB error:', dbError.message);
    }
    
    // If MongoDB failed or returned no users, use dev store
    if (users.length === 0 && devUsers.length > 0) {
      users = devUsers.map(({ password, ...user }) => user); // Remove passwords
      fromDevStore = true;
      console.log(`API: Using ${users.length} users from development store`);
    }
    
    // Return the users, even if it's an empty array
    return NextResponse.json({
      success: true,
      count: users.length,
      users,
      source: fromDevStore ? 'development-store' : 'mongodb'
    });
  } catch (error) {
    console.error('API: Error listing users:', error);
    
    // Return a more detailed error response
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve users',
      message: error instanceof Error ? error.message : 'Unknown error',
      users: [],
      count: 0
    }, { status: 500 });
  }
}
