import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }
    
    // Get connection status
    const status = mongoose.connection.readyState;
    const statusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    }[status] || 'unknown';
    
    // Return connection status
    return NextResponse.json({
      status: 'success',
      mongodb: {
        status,
        statusText,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      }
    });
  } catch (error) {
    console.error('MongoDB connection test error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to connect to MongoDB',
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
