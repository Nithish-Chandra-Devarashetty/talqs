import { NextRequest, NextResponse } from 'next/server';
import { upsertUser } from '@/lib/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to MongoDB using our improved connection utility
    try {
      await connectToDatabase();
      console.log('MongoDB connected for registration');
    } catch (error) {
      console.error('MongoDB connection error in registration:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Check if user exists
    const User = mongoose.models.User;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    console.log('Creating new user with email:', email);
    const user = await upsertUser({
      name,
      email,
      provider: 'credentials',
      password: hashedPassword,
    });

    console.log('User registered successfully:', user._id);

    // Remove password from response
    const userResponse = { ...user };
    delete userResponse.password;

    return NextResponse.json(
      { message: 'User registered successfully', user: userResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
