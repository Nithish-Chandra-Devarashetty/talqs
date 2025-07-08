import mongoose from 'mongoose';

// Define the Document schema
const DocumentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  fingerprint: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
});

// Create or get the Document model
export const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

// Helper function to save a document fingerprint
export async function saveDocument(userId: string, fingerprint: string, fileName: string, fileSize: number) {
  try {
    console.log('Document Model: Saving document for user:', userId);
    console.log('Document Model: Fingerprint:', fingerprint);
    
    // Ensure userId is not empty - this is critical
    if (!userId || userId.trim() === '') {
      console.error('Document Model: Empty userId provided');
      throw new Error('Invalid user ID - cannot save document');
    }
    
    // Check if document already exists for this user and fingerprint
    let document = await Document.findOne({ 
      userId,
      fingerprint
    });

    // If document exists, update last accessed time
    if (document) {
      document.lastAccessedAt = new Date();
      await document.save();
      return document;
    }

    // Create new document record
    document = new Document({
      userId,
      fingerprint,
      fileName,
      fileSize,
      uploadedAt: new Date(),
      lastAccessedAt: new Date()
    });

    await document.save();
    return document;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
}

// Helper function to get documents for a user
export async function getUserDocuments(userId: string) {
  try {
    const documents = await Document.find({ userId })
      .sort({ lastAccessedAt: -1 });
    
    return documents;
  } catch (error) {
    console.error('Error getting user documents:', error);
    throw error;
  }
}

// Helper function to get a document by fingerprint
export async function getDocumentByFingerprint(userId: string, fingerprint: string) {
  try {
    const document = await Document.findOne({ 
      userId,
      fingerprint
    });
    
    return document;
  } catch (error) {
    console.error('Error getting document by fingerprint:', error);
    throw error;
  }
}
