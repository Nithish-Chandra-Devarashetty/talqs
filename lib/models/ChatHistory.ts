import mongoose from 'mongoose';

// Define the Message schema
const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Define the ChatHistory schema
const ChatHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  messages: [MessageSchema],
  documentId: {
    type: String,
    default: null
  },
  documentName: {
    type: String,
    default: null
  },
  documentFingerprint: {
    type: String,
    index: true,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for userId and documentFingerprint
ChatHistorySchema.index({ userId: 1, documentFingerprint: 1 });

// Create or get the ChatHistory model
export const ChatHistory = mongoose.models.ChatHistory || mongoose.model('ChatHistory', ChatHistorySchema);

// Helper function to save a new message to chat history
export async function saveMessage(
  userId: string, 
  role: 'user' | 'ai', 
  content: string, 
  documentId?: string, 
  documentName?: string, 
  documentFingerprint?: string
) {
  try {
    // Find existing chat history for this user and document fingerprint (if provided)
    let chatHistory = await ChatHistory.findOne({ 
      userId,
      ...(documentFingerprint ? { documentFingerprint } : {}),
      ...(documentId && !documentFingerprint ? { documentId } : {})
    });

    // If no chat history exists, create a new one
    if (!chatHistory) {
      chatHistory = new ChatHistory({
        userId,
        messages: [],
        documentId: documentId || null,
        documentName: documentName || null,
        documentFingerprint: documentFingerprint || null
      });
    }

    // Add the new message
    chatHistory.messages.push({
      role,
      content,
      timestamp: new Date()
    });

    // Update the updatedAt timestamp
    chatHistory.updatedAt = new Date();

    // Save the chat history
    await chatHistory.save();
    
    return chatHistory;
  } catch (error) {
    console.error('Error saving message to chat history:', error);
    throw error;
  }
}

// Helper function to get chat history for a user
export async function getChatHistory(userId: string, documentId?: string, documentFingerprint?: string) {
  try {
    console.log('ChatHistory Model: Getting chat history for user:', userId);
    console.log('ChatHistory Model: Document ID:', documentId || 'not provided');
    console.log('ChatHistory Model: Document Fingerprint:', documentFingerprint || 'not provided');
    
    const query: any = { userId };
    
    // Prioritize fingerprint over documentId if both are provided
    if (documentFingerprint) {
      query.documentFingerprint = documentFingerprint;
    } else if (documentId) {
      query.documentId = documentId;
    }
    
    console.log('ChatHistory Model: Query:', JSON.stringify(query));
    
    // If a specific document is requested, return more conversations for that document
    // Otherwise, return a limited number of conversations for the history overview
    const limit = documentFingerprint || documentId ? 50 : 100; // Increased limit for testing
    
    // Check if the collection exists and has documents
    const collectionExists = await ChatHistory.db.collection('chathistories').countDocuments() > 0;
    console.log('ChatHistory Model: Collection exists and has documents:', collectionExists);
    
    const chatHistories = await ChatHistory.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit);
    
    console.log(`ChatHistory Model: Found ${chatHistories.length} chat histories`);
    
    // Log some details about the chat histories for debugging
    chatHistories.forEach((history, index) => {
      console.log(`ChatHistory Model: History ${index + 1}:`, {
        id: history._id,
        documentName: history.documentName,
        documentFingerprint: history.documentFingerprint,
        messageCount: history.messages.length
      });
    });
      
    return chatHistories;
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
}

// Helper function to delete chat history
export async function deleteChatHistory(chatHistoryId: string) {
  try {
    await ChatHistory.findByIdAndDelete(chatHistoryId);
    return true;
  } catch (error) {
    console.error('Error deleting chat history:', error);
    throw error;
  }
}
