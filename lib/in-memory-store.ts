/**
 * In-memory data store for development when MongoDB is not available
 * This provides a fallback mechanism to allow the application to function without a database connection
 */

// Document store
interface StoredDocument {
  userId: string;
  fingerprint: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  lastAccessedAt: Date;
}

// Chat message store
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Chat history store
interface StoredChatHistory {
  id: string;
  userId: string;
  messages: ChatMessage[];
  documentId: string | null;
  documentName: string | null;
  documentFingerprint: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory data stores
const documents: StoredDocument[] = [];
const chatHistories: StoredChatHistory[] = [];

// Generate a simple ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Document operations
export const inMemoryDocumentStore = {
  // Save a document
  saveDocument: (
    userId: string,
    fingerprint: string,
    fileName: string,
    fileSize: number
  ): StoredDocument => {
    // Check if document already exists
    const existingDoc = documents.find(
      doc => doc.userId === userId && doc.fingerprint === fingerprint
    );
    
    if (existingDoc) {
      existingDoc.lastAccessedAt = new Date();
      return existingDoc;
    }
    
    // Create new document
    const newDoc: StoredDocument = {
      userId,
      fingerprint,
      fileName,
      fileSize,
      uploadedAt: new Date(),
      lastAccessedAt: new Date()
    };
    
    documents.push(newDoc);
    return newDoc;
  },
  
  // Get documents for a user
  getUserDocuments: (userId: string): StoredDocument[] => {
    return documents
      .filter(doc => doc.userId === userId)
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());
  },
  
  // Get a document by fingerprint
  getDocumentByFingerprint: (
    userId: string,
    fingerprint: string
  ): StoredDocument | null => {
    return documents.find(
      doc => doc.userId === userId && doc.fingerprint === fingerprint
    ) || null;
  }
};

// Chat history operations
export const inMemoryChatStore = {
  // Save a message
  saveMessage: (
    userId: string,
    role: 'user' | 'ai',
    content: string,
    documentId?: string,
    documentName?: string,
    documentFingerprint?: string
  ): StoredChatHistory => {
    // Find existing chat history
    let chatHistory = chatHistories.find(chat => 
      chat.userId === userId && 
      (documentFingerprint ? chat.documentFingerprint === documentFingerprint : 
       documentId ? chat.documentId === documentId : 
       (!chat.documentId && !chat.documentFingerprint))
    );
    
    // Create new chat history if none exists
    if (!chatHistory) {
      chatHistory = {
        id: generateId(),
        userId,
        messages: [],
        documentId: documentId || null,
        documentName: documentName || null,
        documentFingerprint: documentFingerprint || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      chatHistories.push(chatHistory);
    }
    
    // Add the message
    chatHistory.messages.push({
      role,
      content,
      timestamp: new Date()
    });
    
    // Update timestamp
    chatHistory.updatedAt = new Date();
    
    return chatHistory;
  },
  
  // Get chat history
  getChatHistory: (
    userId: string,
    documentId?: string,
    documentFingerprint?: string
  ): StoredChatHistory[] => {
    return chatHistories
      .filter(chat => {
        if (chat.userId !== userId) return false;
        
        if (documentFingerprint) {
          return chat.documentFingerprint === documentFingerprint;
        } else if (documentId) {
          return chat.documentId === documentId;
        }
        
        return true;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },
  
  // Delete chat history
  deleteChatHistory: (chatHistoryId: string): boolean => {
    const initialLength = chatHistories.length;
    const index = chatHistories.findIndex(chat => chat.id === chatHistoryId);
    
    if (index !== -1) {
      chatHistories.splice(index, 1);
      return true;
    }
    
    return false;
  }
};
