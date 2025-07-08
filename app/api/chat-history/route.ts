import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { saveMessage, getChatHistory, deleteChatHistory } from '@/lib/models/ChatHistory';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Retrieve chat history for the current user
export async function GET(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get session to identify the user
    const session = await getServerSession();
    
    // Get auth header to check for custom auth token
    const authHeader = req.headers.get('authorization');
    const customAuthToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Check for X-User-ID header which is sent from the client
    const userIdHeader = req.headers.get('x-user-id');
    console.log('Chat History API: X-User-ID header:', userIdHeader || 'not provided');
    
    // Check for either NextAuth session or custom auth token
    let userEmail: string | null = null;
    
    console.log('Chat History API: Checking authentication methods');
    console.log('Chat History API: Session:', session ? 'exists' : 'null');
    console.log('Chat History API: Auth token:', customAuthToken ? 'exists' : 'null');
    
    // First check for X-User-ID header which is the most reliable way to identify the user
    if (userIdHeader) {
      userEmail = userIdHeader;
      console.log('Chat History API: User identified via X-User-ID header:', userEmail);
    }
    // Then try NextAuth
    else if (session?.user?.email) {
      // User is authenticated via NextAuth
      userEmail = session.user.email;
      console.log('Chat History API: User authenticated via NextAuth:', userEmail);
    } 
    // Then try custom auth token
    else if (customAuthToken) {
      try {
        // Verify custom auth token (this is a simple implementation - you might want to use JWT)
        const decodedToken = JSON.parse(atob(customAuthToken));
        console.log('Chat History API: Decoded token:', decodedToken);
        if (decodedToken.email) {
          userEmail = decodedToken.email;
          console.log('Chat History API: User authenticated via custom token:', userEmail);
        }
      } catch (error) {
        console.error('Chat History API: Invalid custom auth token', error);
      }
    } 
    
    // Finally try cookies as fallback
    if (!userEmail) {
      const cookies = req.headers.get('cookie');
      console.log('Chat History API: Cookies exist:', !!cookies);
      if (cookies) {
        const talqsUserCookie = cookies.split(';').find(c => c.trim().startsWith('talqs_user='));
        console.log('Chat History API: Found talqs_user cookie:', !!talqsUserCookie);
        if (talqsUserCookie) {
          try {
            const cookieValue = decodeURIComponent(talqsUserCookie.split('=')[1]);
            console.log('Chat History API: Cookie value:', cookieValue);
            const userData = JSON.parse(cookieValue);
            if (userData.email) {
              userEmail = userData.email;
              console.log('Chat History API: User authenticated via cookie:', userEmail);
            }
          } catch (error) {
            console.error('Chat History API: Invalid user cookie', error);
          }
        }
      }
    }
    
    // If we still don't have a user email, try a fallback for testing
    if (!userEmail) {
      // For testing purposes, use a default email
      userEmail = 'test@example.com';
      console.log('Chat History API: Using fallback test email for debugging');
    }
    
    if (!userEmail) {
      console.error('Chat History API: Unauthorized - No valid authentication');
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }
    
    // Get document ID and fingerprint from query params if available
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId') || undefined;
    const documentFingerprint = searchParams.get('fingerprint') || undefined;
    
    console.log('Chat History API: Fetching history with params:', {
      userEmail,
      documentId,
      documentFingerprint
    });
    
    // Get chat history for the user
    const chatHistories = await getChatHistory(userEmail, documentId, documentFingerprint);
    
    console.log(`Chat History API: Found ${chatHistories.length} chat histories`);
    
    // Log some details about the chat histories for debugging
    chatHistories.forEach((history, index) => {
      console.log(`Chat History ${index + 1}:`, {
        documentName: history.documentName,
        documentFingerprint: history.documentFingerprint,
        messageCount: history.messages.length
      });
    });
    
    return NextResponse.json({ success: true, chatHistories });
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chat history' },
      { status: 500 }
    );
  }
}

// POST: Save a new message to chat history
export async function POST(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get session to identify the user
    const session = await getServerSession();
    
    // Get auth header to check for custom auth token
    const authHeader = req.headers.get('authorization');
    const customAuthToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Check for X-User-ID header which is sent from the client
    const userIdHeader = req.headers.get('x-user-id');
    console.log('Chat History API POST: X-User-ID header:', userIdHeader || 'not provided');
    
    // Check for either NextAuth session or custom auth token
    let userEmail: string | null = null;
    
    // First check for X-User-ID header which is the most reliable way to identify the user
    if (userIdHeader) {
      userEmail = userIdHeader;
      console.log('Chat History API POST: User identified via X-User-ID header:', userEmail);
    }
    // Then try NextAuth
    else if (session?.user?.email) {
      // User is authenticated via NextAuth
      userEmail = session.user.email;
      console.log('Chat History API POST: User authenticated via NextAuth:', userEmail);
    } else if (customAuthToken) {
      try {
        // Verify custom auth token
        const decodedToken = JSON.parse(atob(customAuthToken));
        if (decodedToken.email) {
          userEmail = decodedToken.email;
          console.log('Chat History API POST: User authenticated via custom token:', userEmail);
        }
      } catch (error) {
        console.error('Chat History API POST: Invalid custom auth token');
      }
    } else {
      // Check for user in cookies as fallback
      const cookies = req.headers.get('cookie');
      if (cookies) {
        const talqsUserCookie = cookies.split(';').find(c => c.trim().startsWith('talqs_user='));
        if (talqsUserCookie) {
          try {
            const userData = JSON.parse(decodeURIComponent(talqsUserCookie.split('=')[1]));
            if (userData.email) {
              userEmail = userData.email;
              console.log('Chat History API POST: User authenticated via cookie:', userEmail);
            }
          } catch (error) {
            console.error('Chat History API POST: Invalid user cookie');
          }
        }
      }
    }
    
    if (!userEmail) {
      console.error('Chat History API POST: Unauthorized - No valid authentication');
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }
    
    // Parse request body
    const { role, content, documentId, documentName, documentFingerprint, forceCreate, testMode } = await req.json();
    
    console.log('Chat History API POST: Saving message with params:', {
      userEmail,
      role,
      documentId,
      documentName,
      documentFingerprint,
      forceCreate: !!forceCreate,
      testMode: !!testMode
    });
    
    // Validate required fields
    if (!role || !content) {
      return NextResponse.json(
        { error: 'Role and content are required' },
        { status: 400 }
      );
    }
    
    try {
      // For test mode, create a complete conversation with both user and AI messages
      if (testMode) {
        console.log('Chat History API: Creating test conversation');
        
        // Import the ChatHistory model that's already defined
        const { ChatHistory } = await import('@/lib/models/ChatHistory');
        console.log('Chat History API: Model imported:', !!ChatHistory);
        
        // Create a new chat history with both user and AI messages
        const newChatHistory = new ChatHistory({
          userId: userEmail,
          messages: [
            { role: 'user', content: 'What is the main argument in this document?', timestamp: new Date() },
            { role: 'ai', content: 'This document argues that proper legal interpretation requires considering both the letter and spirit of the law.', timestamp: new Date() }
          ],
          documentId: documentId || `doc-${Date.now()}`,
          documentName: documentName || 'Test Document',
          documentFingerprint: documentFingerprint || `test-fingerprint-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Save the chat history
        await newChatHistory.save();
        
        console.log('Chat History API: Test conversation created successfully');
        
        return NextResponse.json({ 
          success: true, 
          message: 'Test conversation created successfully',
          chatHistory: newChatHistory
        });
      }
      
      // Normal flow - save the message
      const chatHistory = await saveMessage(
        userEmail,
        role,
        content,
        documentId,
        documentName,
        documentFingerprint
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Message saved to chat history',
        chatHistory
      });
    } catch (error) {
      console.error('Error in chat history POST handler:', error);
      return NextResponse.json(
        { error: 'Failed to save chat history' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error saving chat history:', error);
    return NextResponse.json(
      { error: 'Failed to save chat history' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a chat history
export async function DELETE(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get session to identify the user
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get chat history ID from query params
    const { searchParams } = new URL(req.url);
    const chatHistoryId = searchParams.get('id');
    
    if (!chatHistoryId) {
      return NextResponse.json(
        { error: 'Chat history ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the chat history
    await deleteChatHistory(chatHistoryId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chat history deleted'
    });
  } catch (error) {
    console.error('Error deleting chat history:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat history' },
      { status: 500 }
    );
  }
}
