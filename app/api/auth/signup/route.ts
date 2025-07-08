import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { upsertUser } from '@/lib/models/User';

// In-memory store for development when MongoDB is not available
let devUsers: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, dateOfBirth } = await req.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Try to upsert user in MongoDB
      await upsertUser({
        name,
        email,
        password: hashedPassword,
        dateOfBirth,
        provider: 'credentials',
      });
      console.log('User successfully saved to MongoDB:', email);
    } catch (dbError) {
      // If MongoDB fails, store in development in-memory store
      console.warn('MongoDB storage failed, using in-memory store:', dbError.message);
      
      // Check if user already exists in dev store
      const existingUserIndex = devUsers.findIndex(u => u.email === email);
      
      if (existingUserIndex >= 0) {
        // Update existing user
        devUsers[existingUserIndex] = {
          ...devUsers[existingUserIndex],
          name,
          password: hashedPassword,
          dateOfBirth,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Add new user
        devUsers.push({
          id: `dev-${Date.now()}`,
          name,
          email,
          password: hashedPassword,
          dateOfBirth,
          provider: 'credentials',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      console.log(`User stored in development memory store. Total users: ${devUsers.length}`);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Sign-up error:', error);
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}

// API route to get all users (for development)
export async function GET(req: NextRequest) {
  try {
    // Try to get users from MongoDB first
    let users = [];
    try {
      const { getAllUsers } = await import('@/lib/models/User');
      users = await getAllUsers();
      console.log(`Retrieved ${users.length} users from MongoDB`);
    } catch (dbError) {
      console.warn('Failed to get users from MongoDB:', dbError.message);
    }
    
    // If MongoDB failed or returned no users, use dev store
    if (users.length === 0 && devUsers.length > 0) {
      users = devUsers.map(({ password, ...user }) => user); // Remove passwords
      console.log(`Using ${users.length} users from development store`);
    }
    
    return NextResponse.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Error retrieving users:', error);
    return NextResponse.json({ error: 'Failed to retrieve users' }, { status: 500 });
  }
}
