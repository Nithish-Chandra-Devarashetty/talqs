import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

// API endpoint to delete chat history for a specific user
export async function DELETE(req: NextRequest) {
  try {
    // Extract userId from request body
    const data = await req.json();
    const { userId } = data;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Connect to database (this returns a mongoose connection)
    await connectToDatabase();
    
    // Check if the connection is established and db is available
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error('MongoDB connection not established');
    }
    
    // Directly use the mongoose connection to access collections
    // Get the conversations collection and delete records
    const conversationsResult = await mongoose.connection.db.collection('conversations')
      .deleteMany({ userId: userId });
    
    // Delete from any other related collections
    const messagesResult = await mongoose.connection.db.collection('messages')
      .deleteMany({ userId: userId });
    
    // Calculate total deleted count
    const totalDeleted = 
      (conversationsResult.deletedCount || 0) + 
      (messagesResult.deletedCount || 0);
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Chat history deleted successfully',
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('Error deleting chat history:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat history' },
      { status: 500 }
    );
  }
}
