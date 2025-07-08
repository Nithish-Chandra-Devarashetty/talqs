import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { saveDocument, getUserDocuments, getDocumentByFingerprint } from '@/lib/models/Document';
import { connectToDatabase } from '@/lib/mongodb';
import { generateFingerprint } from '@/lib/document-utils';

// GET: Retrieve documents for the current user
export async function GET(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get session to identify the user
    const session = await getServerSession();
    
    // Get auth header to check for custom auth token
    const authHeader = req.headers.get('authorization');
    const customAuthToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Check for either NextAuth session or custom auth token
    let userEmail: string | null = null;
    
    if (session?.user?.email) {
      // User is authenticated via NextAuth
      userEmail = session.user.email;
      console.log('Document API GET: User authenticated via NextAuth:', userEmail);
    } else if (customAuthToken) {
      try {
        // Verify custom auth token
        const decodedToken = JSON.parse(atob(customAuthToken));
        if (decodedToken.email) {
          userEmail = decodedToken.email;
          console.log('Document API GET: User authenticated via custom token:', userEmail);
        }
      } catch (error) {
        console.error('Document API GET: Invalid custom auth token');
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
              console.log('Document API GET: User authenticated via cookie:', userEmail);
            }
          } catch (error) {
            console.error('Document API GET: Invalid user cookie');
          }
        }
      }
    }
    
    if (!userEmail) {
      console.error('Document API GET: Unauthorized - No valid authentication');
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }
    
    // Get fingerprint from query params if available
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get('fingerprint');
    
    if (fingerprint) {
      // Get specific document by fingerprint
      const document = await getDocumentByFingerprint(userEmail, fingerprint);
      return NextResponse.json({ success: true, document });
    } else {
      // Get all documents for the user
      const documents = await getUserDocuments(userEmail);
      return NextResponse.json({ success: true, documents });
    }
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

// POST: Save a new document fingerprint
export async function POST(req: NextRequest) {
  try {
    console.log('Document API: POST request received');
    
    // Connect to MongoDB
    console.log('Document API: Connecting to database...');
    const dbConnection = await connectToDatabase();
    if (!dbConnection) {
      console.error('Document API: Failed to connect to database');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    console.log('Document API: Database connected');
    
    // Get session to identify the user
    console.log('Document API: Getting user session...');
    const session = await getServerSession();
    
    // Get auth header to check for custom auth token
    const authHeader = req.headers.get('authorization');
    const customAuthToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Check for either NextAuth session or custom auth token
    let userEmail: string | null = null;
    
    if (session?.user?.email) {
      // User is authenticated via NextAuth
      userEmail = session.user.email;
      console.log('Document API: User authenticated via NextAuth:', userEmail);
      
      // Add additional debugging for Google OAuth session
      console.log('Document API: Full session data:', JSON.stringify(session, null, 2));
    } else if (customAuthToken) {
      try {
        // Verify custom auth token (this is a simple implementation - you might want to use JWT)
        const decodedToken = JSON.parse(atob(customAuthToken));
        if (decodedToken.email) {
          userEmail = decodedToken.email;
          console.log('Document API: User authenticated via custom token:', userEmail);
        }
      } catch (error) {
        console.error('Document API: Invalid custom auth token');
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
              console.log('Document API: User authenticated via cookie:', userEmail);
            }
          } catch (error) {
            console.error('Document API: Invalid user cookie');
          }
        }
      }
    }
    
    if (!userEmail) {
      console.error('Document API: Unauthorized - No valid authentication');
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }
    
    console.log('Document API: User authenticated:', userEmail);
    
    // Parse request body
    console.log('Document API: Parsing request body...');
    const body = await req.json();
    console.log('Document API: Request body:', body);
    
    const { fingerprint, fileName, fileSize, content } = body;
    
    // Validate required fields
    if (!fingerprint || !fileName || !fileSize) {
      console.error('Document API: Missing required fields');
      return NextResponse.json(
        { error: 'Fingerprint, fileName, and fileSize are required' },
        { status: 400 }
      );
    }
    console.log('Document API: All required fields present');
    
    // Log the fingerprint being saved
    console.log('Document API: Saving fingerprint:', fingerprint);
    
    // Verify fingerprint if content is provided
    if (content) {
      const calculatedFingerprint = generateFingerprint(content);
      if (calculatedFingerprint !== fingerprint) {
        return NextResponse.json(
          { error: 'Invalid fingerprint' },
          { status: 400 }
        );
      }
    }
    
    // Save the document
    const document = await saveDocument(
      userEmail, // Use the authenticated email from any auth method
      fingerprint,
      fileName,
      fileSize
    );
    
    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Error saving document fingerprint:', error);
    return NextResponse.json(
      { error: 'Failed to save document fingerprint' },
      { status: 500 }
    );
  }
}
