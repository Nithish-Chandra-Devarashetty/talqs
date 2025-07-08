"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"
import { motion, useInView } from "framer-motion"
import { Send, Play, Pause, AlertCircle, MessageSquare, Sparkles, Bot, User, Download, Clock, History, FileText, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { TextToSpeech } from "@/components/ui/text-to-speech"
import PdfGenerator from "./pdf-generator"
import { useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { extractFileMetadata } from "@/lib/document-utils"
import { getUserId, getUserDisplayName, storeAuthUser } from "@/lib/user-utils"

interface DocumentMetadata {
  fingerprint: string;
  name: string;
  size: number;
  _isNewUpload?: boolean;
  _uploadTimestamp?: number;
}

export default function QASection() {
  const [question, setQuestion] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [answer, setAnswer] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [displayedAnswer, setDisplayedAnswer] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ type: "user" | "ai"; content: string; timestamp?: Date }[]>([])
  const [showTTS, setShowTTS] = useState(false)
  const [predefinedQuestions, setPredefinedQuestions] = useState<string[]>([])
  const [uploadedDocumentContent, setUploadedDocumentContent] = useState<string>("")
  const [previousChats, setPreviousChats] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [currentDocumentMetadata, setCurrentDocumentMetadata] = useState<DocumentMetadata | null>(null)
  const [previousQuestions, setPreviousQuestions] = useState<{question: string, timestamp: string}[]>([])
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean; chatId?: string; isAll?: boolean}>({
    show: false,
    chatId: undefined,
    isAll: false
  })

  const { data: session } = useSession()
  // Store persistent user ID
  const [persistentUserId, setPersistentUserId] = useState<string>('')

  const sectionRef = useRef<HTMLElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 })
  const typingRef = useRef<NodeJS.Timeout | null>(null)
  
  // Function to manually migrate existing chat history to the current user ID
  const migrateHistory = () => {
    try {
      // Get current user ID
      const currentUserId = persistentUserId || getUserId();
      console.log('Migrating history to user ID:', currentUserId);
      
      // Get existing chat history
      const chatHistoryStr = localStorage.getItem('talqs_chat_history');
      if (!chatHistoryStr) {
        console.log('No chat history found to migrate');
        return;
      }
      
      const chatHistory = JSON.parse(chatHistoryStr);
      if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
        console.log('No conversations found to migrate');
        return;
      }
      
      console.log(`Found ${chatHistory.length} total conversations`);
      
      // Get all existing user IDs from the chat history
      const existingUserIds = new Set<string>();
      chatHistory.forEach((chat: any) => {
        if (chat.userId) existingUserIds.add(chat.userId);
      });
      
      console.log('Found user IDs in chat history:', Array.from(existingUserIds));
      
      // Update all conversations to use the current user ID
      let migratedCount = 0;
      chatHistory.forEach((chat: any) => {
        // Assign all conversations to the current user
        chat.userId = currentUserId;
        migratedCount++;
      });
      
      // Save the updated chat history
      localStorage.setItem('talqs_chat_history', JSON.stringify(chatHistory));
      console.log(`Migrated ${migratedCount} conversations to current user ID: ${currentUserId}`);
      
      // Refresh the chat history display
      fetchChatHistory();
    } catch (error) {
      console.error('Error manually migrating chat history:', error);
    }
  };
  
  // Initialize persistent user ID and store authenticated user if available
  useEffect(() => {
    // Get persistent user ID
    const userId = getUserId();
    setPersistentUserId(userId);
    console.log('Using persistent user ID:', userId);
    
    // If user is authenticated via NextAuth, store their info
    if (session?.user?.email) {
      storeAuthUser({
        email: session.user.email,
        name: session.user.name || undefined,
        image: session.user.image || undefined
      });
      console.log('Stored authenticated user:', session.user.email);
    }
    
    // Manually migrate history to ensure all conversations are preserved
    migrateHistory();
  }, [session])

  // Function to fetch previous questions (simpler approach that doesn't rely on document indexing)
  const fetchPreviousQuestions = async (fingerprint?: string) => {
    if (!session?.user?.email) return;
    
    try {
      console.log('Fetching all previous questions');
      
      // Fetch all chat history without filtering by fingerprint
      const response = await fetch('/api/chat-history');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch question history');
      }
      
      const data = await response.json();
      console.log('Chat history data received:', data);
      
      if (data.chatHistories && data.chatHistories.length > 0) {
        // Extract user questions from all chat histories
        let allQuestions: QuestionItem[] = [];
        
        data.chatHistories.forEach((history: any) => {
          const docName = history.documentName || 'Unknown Document';
          const docFingerprint = history.documentFingerprint;
          
          // Get user messages from this history
          const userMessages = history.messages.filter((msg: any) => msg.role === 'user');
          
          // Convert to question items
          userMessages.forEach((msg: any) => {
            allQuestions.push({
              question: msg.content,
              timestamp: new Date(msg.timestamp).toLocaleString(),
              documentFingerprint: docFingerprint,
              documentName: docName
            });
          });
        });
        
        console.log(`Extracted ${allQuestions.length} total questions from chat history`);
        
        // Sort by most recent first
        allQuestions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Take the 20 most recent questions
        const recentQuestions = allQuestions.slice(0, 20);
        setPreviousQuestions(recentQuestions);
        console.log(`Set ${recentQuestions.length} recent questions`);
        
        // For suggested questions, use the 4 most recent unique questions
        const uniqueQuestions = Array.from(new Set(recentQuestions.map(q => q.question)));
        setSuggestedQuestions(uniqueQuestions.slice(0, 4));
        
      } else {
        console.log('No chat histories found');
        setPreviousQuestions([]);
        setSuggestedQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching previous questions:', error);
      setPreviousQuestions([]);
      setSuggestedQuestions([]);
    }
  };
  
  // Method to set the current document metadata and load previous questions
  const setCurrentDocument = async (metadata: DocumentMetadata) => {
    // If we're already on this document, don't do anything
    if (currentDocumentMetadata?.fingerprint === metadata.fingerprint) {
      console.log('Already on this document, not switching');
      return;
    }
    
    console.log(`Switching to document: ${metadata.name} (${metadata.fingerprint})`);
    
    // Clear all previous document-specific data
    setChatHistory([]); 
    setAnswer("");
    setDisplayedAnswer("");
    setShowTTS(false);
    setPreviousQuestions([]);
    setSuggestedQuestions([]);
    
    // Set the new document metadata
    setCurrentDocumentMetadata(metadata);
    
    // Fetch previous questions for this document
    if (metadata.fingerprint) {
      await fetchPreviousQuestions(metadata.fingerprint);
    }
    
    // Dispatch an event to notify other components about the document change
    const event = new CustomEvent('documentChanged', {
      detail: { documentMetadata: metadata }
    });
    window.dispatchEvent(event);
  };
  
  // Listen for document upload events from other components
  useEffect(() => {
    const handleDocumentUploaded = (event: CustomEvent) => {
      if (event.detail && event.detail.documentMetadata) {
        // Always treat document uploads as new uploads that should clear previous conversations
        const isNewUpload = true; // Force this to always be true
        
        console.log(`Document uploaded event received. Starting fresh conversation.`);
        
        // Clear all existing conversations and start fresh
        setChatHistory([]);
        setAnswer("");
        setDisplayedAnswer("");
        setShowTTS(false);
        setPreviousQuestions([]);
        setSuggestedQuestions([]);
        
        // Add a special flag to the document metadata to mark it as a new upload
        const enhancedMetadata = {
          ...event.detail.documentMetadata,
          _isNewUpload: true,
          _uploadTimestamp: Date.now()
        };
        
        // Set the new document metadata with our enhanced version
        setCurrentDocumentMetadata(enhancedMetadata);
        
        // Also store this in localStorage to ensure persistence across page refreshes
        localStorage.setItem('talqs_current_document', JSON.stringify(enhancedMetadata));
        
        // Log the document we're switching to
        console.log(`Started fresh conversation for document: ${enhancedMetadata.name} (${enhancedMetadata.fingerprint})`);
        console.log('Enhanced metadata:', enhancedMetadata);
        
        // We don't fetch previous questions here because we want a completely fresh start
        // Instead, we'll let new questions be saved under this document name
        
        // Clear any existing conversations for this document in localStorage
        try {
          const localChatHistoryStr = localStorage.getItem('talqs_chat_history') || '[]';
          let localChatHistory = JSON.parse(localChatHistoryStr);
          
          // Keep conversations for other documents, remove ones for this document
          const filteredHistory = localChatHistory.filter((chat: any) => 
            chat.documentFingerprint !== enhancedMetadata.fingerprint
          );
          
          localStorage.setItem('talqs_chat_history', JSON.stringify(filteredHistory));
          console.log('Cleared existing conversations for this document in localStorage');
        } catch (e) {
          console.error('Error clearing localStorage conversations:', e);
        }
      }
    };
    
    // Add event listener for document uploads
    window.addEventListener('documentUploaded' as any, handleDocumentUploaded);
    
    return () => {
      window.removeEventListener('documentUploaded' as any, handleDocumentUploaded);
    };
  }, []);
  
  useEffect(() => {
    // Check if there's an uploaded document
    const checkForUploadedDocument = async () => {
      try {
        // In a real implementation, you would fetch the uploaded document
        // For now, we'll use placeholder text
        setUploadedDocumentContent("This is a placeholder for the uploaded document content.");
      } catch (error) {
        console.error("Error checking for uploaded document:", error);
      }
    };

    checkForUploadedDocument();
  }, []);

  useEffect(() => {
    // Fetch predefined questions from API
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/qa');
        if (response.ok) {
          const data = await response.json();
          setPredefinedQuestions(data.questions);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };
    
    fetchQuestions();
  }, []);

  // Function to load all conversation history for the history modal
  const fetchChatHistory = async () => {
    console.log('Fetching chat history, session:', session);
    
    setIsLoadingHistory(true);
    
    // Initialize localChats at the top level so it's accessible in the catch block
    let localChats: any[] = [];
    
    // Get current user ID using our persistent ID system
    const userId = persistentUserId || getUserId();
    console.log('Fetching chat history for user ID:', userId);
    
    // If no user ID exists, there's no history to fetch (should never happen with our new system)
    if (!userId) {
      console.log('No user ID found, cannot fetch chat history');
      setIsLoadingHistory(false);
      setPreviousChats([]);
      return;
    }
    
    try {
      // Always try to get chat history from localStorage first
      const localChatHistoryStr = localStorage.getItem('talqs_chat_history') || '[]';
      
      if (localChatHistoryStr) {
        try {
          localChats = JSON.parse(localChatHistoryStr);
          console.log('Found local chat history:', localChats.length, 'total conversations');
          
          // Filter chats to only include those belonging to the current user
          localChats = localChats.filter((chat: any) => chat.userId === userId);
          console.log('After filtering by user ID:', localChats.length, 'conversations belong to current user');
          
          // Sort by most recent first
          localChats.sort((a: any, b: any) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
          
          // Log each conversation for debugging
          localChats.forEach((chat: any, index: number) => {
            console.log(`User chat ${index + 1}:`, {
              userId: chat.userId,
              documentName: chat.documentName,
              fingerprint: chat.documentFingerprint,
              conversationId: chat.conversationId,
              messages: chat.messages?.length || 0
            });
          });
          
          // Always use local chats if available
          setPreviousChats(localChats);
        } catch (e) {
          console.error('Error parsing local chat history:', e);
        }
      } else {
        console.log('No local chat history found');
      }
      
      // Otherwise try to fetch from API
      console.log('No local chat history, trying API...');
      
      // Check for any authentication method
      const storedUser = localStorage.getItem('talqs_user');
      const isAuthenticated = !!session?.user?.email || !!storedUser;
      
      if (!isAuthenticated) {
        console.error('No authentication found for fetching chat history');
        setIsLoadingHistory(false);
        return;
      }
      
      // Get user data from localStorage for authentication
      let authToken = '';
      
      if (storedUser) {
        // Create a simple auth token from the user data
        authToken = btoa(storedUser);
        console.log('Using local storage auth for chat history');
      }
      
      console.log('Sending request to fetch chat history...');
      
      // Fetch all chat history without filtering by document, but include user ID
      const response = await fetch('/api/chat-history', {
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-User-ID': userId, // Always include persistent user ID in the request
          'X-Persistent-ID': userId, // Include as a separate header for clarity
        },
      });
      
      console.log('Chat history response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch chat history:', response.status, errorText);
        throw new Error(`Failed to fetch chat history: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched chat history data:', data);
      
      if (data.chatHistories && data.chatHistories.length > 0) {
        console.log(`Found ${data.chatHistories.length} chat histories from API`);
        
        // Combine API chat histories with local chat histories
        const combinedChats = [...data.chatHistories, ...localChats];
        
        // Create a map to deduplicate conversations by a composite key
        const uniqueChats = new Map();
        
        // Use a more specific composite key for better deduplication
        combinedChats.forEach((chat: any) => {
          // Create a unique key based on multiple properties
          const key = chat.conversationId || 
                     `${chat.documentFingerprint || ''}-${chat.uploadTimestamp || ''}-${chat.userId || ''}`;
          
          // If we already have this conversation, keep the one with more messages
          if (uniqueChats.has(key)) {
            const existingChat = uniqueChats.get(key);
            const existingMsgCount = existingChat.messages?.length || 0;
            const newMsgCount = chat.messages?.length || 0;
            
            // Only replace if this one has more messages
            if (newMsgCount > existingMsgCount) {
              console.log(`Replacing conversation for ${chat.documentName} with version that has more messages (${newMsgCount} vs ${existingMsgCount})`);
              uniqueChats.set(key, chat);
            }
          } else {
            // New conversation
            uniqueChats.set(key, chat);
          }
        });
        
        // Convert map back to array
        const dedupedChats = Array.from(uniqueChats.values());
        
        // Sort by most recent first
        const sortedChats = dedupedChats.sort((a: any, b: any) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        
        console.log(`Combined ${combinedChats.length} chats, deduped to ${dedupedChats.length}`);
        setPreviousChats(sortedChats);
      } else {
        console.log('No chat histories found in API response, using local chats');
        setPreviousChats(localChats);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      // Always fall back to local chats if available
      if (localChats && localChats.length > 0) {
        console.log('Falling back to local chat history after error');
        setPreviousChats(localChats);
      } else {
        setPreviousChats([]);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // Fetch all chat history when the component loads or session changes
  useEffect(() => {
    fetchChatHistory();
    
    // Create a test conversation if no conversations exist
    setTimeout(() => {
      if (previousChats.length === 0) {
        console.log('No conversations found, creating a test conversation...');
        createTestConversation();
      }
    }, 2000);
  }, [session]);
  
  // Function to create a test conversation for debugging
  const createTestConversation = async () => {
    try {
      console.log('Creating test conversation directly...');
      
      // Create a test document metadata
      const testDocumentMetadata = {
        fingerprint: 'test-fingerprint-' + Date.now(),
        name: 'Test Document',
        size: 1024
      };
      
      // Set as current document
      setCurrentDocumentMetadata(testDocumentMetadata);
      
      // Get user email - either from session or create a test one
      const userEmail = session?.user?.email || 'test@example.com';
      console.log('Using user email for test:', userEmail);
      
      // Create direct API call to save chat history
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'user',
          content: 'What is the main argument in this document?',
          documentId: 'test-doc-id-' + Date.now(),
          documentName: testDocumentMetadata.name,
          documentFingerprint: testDocumentMetadata.fingerprint,
          forceCreate: true, // Force creation of a new chat history
          testMode: true // Indicate this is a test
        }),
      });
      
      console.log('Test conversation API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create test conversation:', errorText);
        throw new Error(`Failed to create test conversation: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Test conversation created:', responseData);
      
      // Refresh chat history after a delay
      setTimeout(() => {
        console.log('Refreshing chat history after test conversation creation...');
        fetchChatHistory();
      }, 2000);
      
      console.log('Test conversation creation process completed');
    } catch (error) {
      console.error('Error creating test conversation:', error);
    }
  };
  
  // Refresh chat history after saving a new message
  useEffect(() => {
    // Only refresh if there's chat history
    if (chatHistory.length > 0) {
      fetchChatHistory();
    }
  }, [chatHistory.length]);

  useEffect(() => {
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current)
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom of chat when new messages are added
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatHistory])

  // Define the interface for our question items
  interface QuestionItem {
    question: string;
    timestamp: string;
    documentFingerprint?: string;
    documentName?: string;
  }
  
  // Save message to chat history
  const saveToChatHistory = async (role: 'user' | 'ai', content: string, skipLocalUpdate: boolean = false) => {
    try {
      // Check if we have current document metadata
      if (!currentDocumentMetadata) {
        console.log('No current document metadata, checking localStorage...');
        // Try to get from localStorage
        const storedMetadata = localStorage.getItem('talqs_current_document');
        if (storedMetadata) {
          try {
            const parsedMetadata = JSON.parse(storedMetadata);
            console.log('Found document metadata in localStorage:', parsedMetadata.name);
            // Set as current document metadata
            setCurrentDocumentMetadata(parsedMetadata);
          } catch (e) {
            console.error('Error parsing stored document metadata:', e);
          }
        }
      }
      
      // Log which document we're saving this message for
      console.log(`Saving ${role} message for document: ${currentDocumentMetadata?.fingerprint || 'general conversation'}`);
      
      // Get the document name and ID for this message
      const documentName = currentDocumentMetadata ? currentDocumentMetadata.name : 'General Conversation';
      const documentId = currentDocumentMetadata ? 
        `doc-${currentDocumentMetadata.fingerprint?.substring(0, 8) || Date.now()}` : 'general-conversation';
      const documentFingerprint = currentDocumentMetadata?.fingerprint || null;
      
      // Create a unique conversation ID for this document upload session
      // This ensures each document upload gets its own conversation thread
      const uploadTimestamp = currentDocumentMetadata?._uploadTimestamp || Date.now();
      const conversationId = `${documentFingerprint || documentId}-${uploadTimestamp}`;
      
      console.log('Using conversation ID:', conversationId);
      
      // Create a message object
      const message = {
        role,
        content,
        timestamp: new Date().toISOString()
      };
      
      // First, save to localStorage as a fallback
      try {
        // Get current user ID using our persistent ID system
        const currentUserId = persistentUserId || getUserId();
        console.log('Using persistent user ID for chat history:', currentUserId);
        
        // Get existing chat history from localStorage
        const localChatHistoryStr = localStorage.getItem('talqs_chat_history') || '[]';
        let localChatHistory = JSON.parse(localChatHistoryStr);
        
        // Find existing conversation for this document using the conversation ID AND user ID
        let conversation = localChatHistory.find((chat: any) => 
          chat.conversationId === conversationId && chat.userId === currentUserId
        );
        
        // If no conversation exists, create a new one
        if (!conversation) {
          conversation = {
            _id: `local-${Date.now()}`,
            userId: currentUserId,
            messages: [],
            documentId,
            documentName,
            documentFingerprint,
            conversationId,
            uploadTimestamp,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          localChatHistory.push(conversation);
          console.log('Created new conversation for document:', documentName, 'with ID:', conversationId, 'for user:', currentUserId);
        }
        
        // Add the message to the conversation
        conversation.messages.push(message);
        conversation.updatedAt = new Date().toISOString();
        
        // Deduplicate the chat history before saving
        // Create a map using a composite key of conversationId AND userId to ensure uniqueness
        const uniqueChats = new Map();
        localChatHistory.forEach((chat: any) => {
          // Create a composite key that includes both the conversation ID and user ID
          // This ensures we don't accidentally merge conversations from different users
          const key = `${chat.userId}-${chat.conversationId || `${chat.documentFingerprint}-${chat.uploadTimestamp}` || chat._id}`;
          
          // If this key already exists in our map, we need to decide which one to keep
          if (uniqueChats.has(key)) {
            const existingChat = uniqueChats.get(key);
            // Keep the one with more messages or the more recently updated one
            if ((chat.messages && existingChat.messages && chat.messages.length > existingChat.messages.length) ||
                (new Date(chat.updatedAt) > new Date(existingChat.updatedAt))) {
              uniqueChats.set(key, chat);
            }
          } else {
            uniqueChats.set(key, chat);
          }
        });
        
        // Convert back to array
        const dedupedChatHistory = Array.from(uniqueChats.values());
        
        // Log the deduplication results
        console.log(`Deduplication: ${localChatHistory.length} chats reduced to ${dedupedChatHistory.length}`);
        
        // Save updated chat history to localStorage
        localStorage.setItem('talqs_chat_history', JSON.stringify(dedupedChatHistory));
        console.log('Saved message to localStorage chat history');
        
        // Update chat history state with the properly formatted message
        // Only if we're not skipping local update
        if (!skipLocalUpdate) {
          setChatHistory(prev => [...prev, {
            type: role,
            content: content,
            timestamp: new Date(message.timestamp)
          }]);
        }
      } catch (e) {
        console.error('Error saving to localStorage chat history:', e);
      }
      
      // Then try to save to the API if user is authenticated
      if (session?.user?.email || localStorage.getItem('talqs_user')) {
        // Get user data from localStorage for authentication
        const storedUser = localStorage.getItem('talqs_user');
        let authToken = '';
        
        if (storedUser) {
          // Create a simple auth token from the user data
          authToken = btoa(storedUser);
        }
        
        // Make the API call to save the message
        const response = await fetch('/api/chat-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : '',
          },
          body: JSON.stringify({
            role,
            content,
            documentId,
            documentName,
            documentFingerprint,
          }),
        });
        
        // Check if the response is ok before parsing JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error saving to chat history API:', errorText);
          throw new Error(`Failed to save message: ${response.status}`);
        }
        
        // Log the response for debugging
        const responseData = await response.json();
        console.log('Save to chat history API response:', responseData);
      }
      
      // If this is a user question, add it to previous questions
      if (role === 'user') {
        const newQuestion: QuestionItem = { 
          question: content, 
          timestamp: new Date().toLocaleString(),
          documentFingerprint: currentDocumentMetadata?.fingerprint,
          documentName: documentName
        };
        
        // Add to previous questions
        setPreviousQuestions(prev => [newQuestion, ...prev]);
        
        // Update suggested questions if needed
        if (currentDocumentMetadata?.fingerprint) {
          setSuggestedQuestions(prev => {
            // If we have less than 4 suggested questions, add this one
            if (prev.length < 4) {
              return [content, ...prev];
            }
            // Otherwise, replace the last one
            const newSuggestions = [content, ...prev.slice(0, 3)];
            return newSuggestions;
          });
        }
        
        // Refresh the questions for all documents after a short delay
        setTimeout(() => {
          fetchPreviousQuestions(currentDocumentMetadata?.fingerprint || '');
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving to chat history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isProcessing) return

    // We'll let saveToChatHistory handle adding the message to the chat history
    // to avoid duplicates
    
    // Save user question to chat history and MongoDB
    await saveToChatHistory('user', question);

    setIsProcessing(true)
    setProgress(0)
    setAnswer("")
    setDisplayedAnswer("")
    setShowTTS(false)

    // Simulate processing progress
    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += 5
      setProgress(currentProgress)

      if (currentProgress >= 100) {
        clearInterval(interval)
      }
    }, 100)

    try {
      // Call the internal Next.js API to get the answer
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          documentFingerprint: currentDocumentMetadata?.fingerprint || null,
          documentName: currentDocumentMetadata?.name || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      setIsProcessing(false);
      setAnswer(data.answer);
      simulateTyping(data.answer);
      
      // We'll let simulateTyping handle adding the AI response to the chat history
      // to avoid duplicates
      
      // Refresh previous questions if we have a document fingerprint
      if (currentDocumentMetadata?.fingerprint) {
        await fetchPreviousQuestions(currentDocumentMetadata.fingerprint);
      }
      
      setQuestion(""); // Clear input after sending
    } catch (error) {
      console.error('Error getting answer:', error);
      setIsProcessing(false);
      const errorMsg = "Sorry, I couldn't process your question. Please try again.";
      setAnswer(errorMsg);
      simulateTyping(errorMsg);
      setQuestion("");
    }
  }

  const simulateTyping = async (textToType: string) => {
    setIsTyping(true)

    // Add empty AI message to show typing indicator
    setChatHistory((prev) => [...prev, { type: "ai", content: "", timestamp: new Date() }])

    let i = 0
    const typing = () => {
      if (i < textToType.length) {
        setDisplayedAnswer(textToType.substring(0, i + 1))
        i++
        typingRef.current = setTimeout(typing, 20)
      } else {
        setIsTyping(false)
        // Update the AI message with full content
        setChatHistory((prev) => {
          const newHistory = [...prev]
          newHistory[newHistory.length - 1].content = textToType
          return newHistory
        })
        
        // Save AI response to chat history database only
        // We don't update the local chat history again since we already did above
        saveToChatHistory('ai', textToType, true)
      }
    }
    typing()
  }

  const toggleAudio = () => {
    setIsPlaying(!isPlaying)
    setShowTTS(!showTTS)
  }
  
  // Interface for chat history item
  interface ChatHistoryItem {
    _id: string;
    userId: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
    documentId?: string;
    documentName?: string;
    documentFingerprint?: string;
    createdAt: string;
    updatedAt: string;
  }

  // Function to delete a single conversation
  const deleteConversation = async (chatId: string) => {
    try {
      // Get the user ID
      const userId = persistentUserId || getUserId();
      
      // Make API call to delete the conversation
      const response = await fetch(`/api/chat-history/${chatId}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.status}`);
      }
      
      // Also remove from local storage
      try {
        const chatHistoryStr = localStorage.getItem('talqs_chat_history');
        if (chatHistoryStr) {
          const chatHistory = JSON.parse(chatHistoryStr);
          if (Array.isArray(chatHistory)) {
            // Filter out the deleted conversation
            const updatedChatHistory = chatHistory.filter(chat => 
              chat.conversationId !== chatId && 
              chat.id !== chatId
            );
            localStorage.setItem('talqs_chat_history', JSON.stringify(updatedChatHistory));
          }
        }
      } catch (error) {
        console.error('Error updating local storage after deletion:', error);
      }
      
      // Update the UI to remove the deleted conversation
      setPreviousChats(prevChats => prevChats.filter(chat => 
        chat.conversationId !== chatId && chat.id !== chatId
      ));
      
      // Close the confirmation dialog
      setDeleteConfirmation({
        show: false,
        chatId: undefined,
        isAll: false
      });
      
      console.log(`Successfully deleted conversation: ${chatId}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };
  
  // Function to delete all conversations
  const deleteAllConversations = async () => {
    try {
      // Get the user ID
      const userId = persistentUserId || getUserId();
      
      // Make API call to delete all conversations
      const response = await fetch(`/api/chat-history`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete all conversations: ${response.status}`);
      }
      
      // Clear local storage as well
      localStorage.removeItem('talqs_chat_history');
      
      // Update the UI to clear all conversations
      setPreviousChats([]);
      
      // Close the confirmation dialog
      setDeleteConfirmation({
        show: false,
        chatId: undefined,
        isAll: false
      });
      
      console.log('Successfully deleted all conversations');
    } catch (error) {
      console.error('Error deleting all conversations:', error);
    }
  };

  // Function to load a specific conversation from history
  const loadConversation = async (chat: ChatHistoryItem) => {
    // Clear current chat history
    setChatHistory([])
    setAnswer("");
    setDisplayedAnswer("");
    setShowTTS(false);
    
    // Set document metadata if available
    if (chat.documentFingerprint) {
      const newDocumentMetadata = {
        fingerprint: chat.documentFingerprint,
        name: chat.documentName || 'Document',
        size: 0 // We don't have the size in the chat history
      };
      
      setCurrentDocumentMetadata(newDocumentMetadata);
      
      // Fetch previous questions for this document
      await fetchPreviousQuestions(chat.documentFingerprint);
    } else {
      // Clear document metadata if it's a general conversation
      setCurrentDocumentMetadata(null);
      setPreviousQuestions([]);
      setSuggestedQuestions([]);
    }
    
    // Convert messages to the format expected by the chat history
    const formattedMessages = chat.messages.map((msg) => ({
      type: msg.role === 'user' ? 'user' as const : 'ai' as const,
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }))
    
    // Set the chat history
    setChatHistory(formattedMessages)
    
    // If there's an AI response, set it as the current answer
    const lastAiMessage = formattedMessages.filter(msg => msg.type === 'ai').pop()
    if (lastAiMessage) {
      setAnswer(lastAiMessage.content)
      setDisplayedAnswer(lastAiMessage.content)
    }
    
    // Close the modal
    setShowHistoryModal(false)
    
    // Scroll to the chat section
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Display a toast or notification that the conversation was loaded
    console.log(`Loaded conversation from ${chat.documentName || 'General Conversation'}`);
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.section
      ref={sectionRef}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      id="qa"
      className="py-20"
    >
      <div className="text-center mb-16">
        <motion.p variants={itemVariants} className="text-sm font-medium text-primary mb-2">
          LEGAL Q&A
        </motion.p>
        <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
          Ask Legal Questions
        </motion.h2>
        <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
          Ask specific questions about your legal documents and get AI-powered answers.
        </motion.p>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="max-w-3xl mx-auto premium-card glow-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Legal Assistant
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* History button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1 hover:bg-primary/10"
                  onClick={() => setShowHistoryModal(true)}
                  title="View conversation history"
                >
                  <Clock className="h-4 w-4" />
                  <span>History</span>
                </Button>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <AlertCircle className="h-5 w-5" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 glass shadow-glow-sm">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Q&A Section</h4>
                      <p className="text-sm">
                        Ask specific questions about your uploaded legal documents. For example: "What was the court's
                        ruling?" or "What legal principles were applied?"
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              {/* History Modal */}
              {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                    <div className="p-4 border-b flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Conversation History
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          User ID: {persistentUserId || getUserId()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Delete All button */}
                        {previousChats.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setDeleteConfirmation({ show: true, isAll: true })}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                            Delete All
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full"
                          onClick={() => setShowHistoryModal(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                            <path d="M18 6 6 18"/>
                            <path d="m6 6 12 12"/>
                          </svg>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border-b">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          className="w-full px-4 py-2 pl-10 bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          onChange={(e) => {
                            // In a real implementation, you would filter the conversations based on the search term
                            console.log('Search term:', e.target.value);
                          }}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.3-4.3"/>
                        </svg>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                      {isLoadingHistory ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      ) : previousChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                          <div className="bg-muted p-3 rounded-full mb-3">
                            <MessageSquare className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-medium mb-1">No conversation history</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            Your conversations will appear here once you start asking questions.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Group conversations by document */}
                          {(() => {
                            // Group chats by document fingerprint and upload timestamp
                            const groupedChats: Record<string, any[]> = {};
                            
                            // Add a special group for general conversations (no document)
                            groupedChats['general'] = [];
                            
                            // Group the chats by document and upload session
                            previousChats.forEach(chat => {
                              // Create a unique key that includes both document fingerprint and upload timestamp
                              // This ensures each document upload session gets its own group
                              let key;
                              
                              if (chat.documentFingerprint) {
                                // If the chat has a conversation ID, use that for precise grouping
                                if (chat.conversationId) {
                                  key = chat.conversationId;
                                } else {
                                  // Otherwise use document fingerprint
                                  key = chat.documentFingerprint;
                                }
                              } else if (chat.documentName) {
                                // If no fingerprint but has name, use name
                                key = `name-${chat.documentName}`;
                              } else {
                                // General conversation
                                key = 'general';
                              }
                              
                              if (!groupedChats[key]) {
                                groupedChats[key] = [];
                              }
                              groupedChats[key].push(chat);
                            });
                            
                            // Render each group
                            return Object.entries(groupedChats).map(([key, chats]) => {
                              if (chats.length === 0) return null;
                              
                              // Get document name from the first chat in the group
                              const documentName = key === 'general' 
                                ? 'General Conversations' 
                                : chats[0].documentName || 'Document';
                              
                              // Get upload timestamp if available
                              const uploadTime = chats[0].uploadTimestamp ? 
                                new Date(chats[0].uploadTimestamp).toLocaleString() : '';
                              
                              // Check if this is the current document and conversation
                              const isCurrentConversation = currentDocumentMetadata && 
                                chats[0].conversationId === `${currentDocumentMetadata.fingerprint}-${currentDocumentMetadata._uploadTimestamp}`;
                              
                              return (
                                <div key={key} className="mb-6">
                                  <div className={`flex items-center gap-2 mb-2 px-2 py-1 rounded ${isCurrentConversation ? 'bg-primary/10' : ''}`}>
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div className="flex flex-col">
                                      <h3 className="text-sm font-medium">{documentName}</h3>
                                      <div className="flex items-center gap-1">
                                        {/* Show message count */}
                                        <span className="text-xs text-muted-foreground">
                                          {chats[0].messages?.length || 0} messages
                                        </span>
                                        {/* Show upload time if available */}
                                        {uploadTime && (
                                          <span className="text-xs text-muted-foreground">
                                            • {uploadTime}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isCurrentConversation && (
                                      <Badge variant="outline" className="ml-auto text-xs">
                                        Current
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2 pl-2">
                                    {chats.map((chat, chatIndex) => {
                                      const conversationDate = new Date(chat.updatedAt).toLocaleString();
                                      
                                      return (
                                        <div 
                                          key={chatIndex}
                                          className="border rounded-md p-3 hover:bg-muted/50 relative group"
                                        >
                                          <div 
                                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteConfirmation({ 
                                                show: true, 
                                                chatId: chat.conversationId || chat.id 
                                              });
                                            }}
                                          >
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18"/>
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                              </svg>
                                            </Button>
                                          </div>
                                          <div 
                                            className="cursor-pointer"
                                            onClick={() => loadConversation(chat)}
                                          >
                                            <div className="flex justify-between items-center mb-2">
                                              <span className="text-xs text-muted-foreground">
                                                {conversationDate}
                                              </span>
                                              <Badge variant="outline" className="text-xs">
                                                {chat.messages.length} messages
                                              </Badge>
                                            </div>
                                          
                                          <div className="space-y-1">
                                            {chat.messages.slice(0, 2).map((message: { role: string; content: string; timestamp: string }, msgIndex: number) => (
                                              <div key={msgIndex} className="flex gap-2">
                                                <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-primary' : 'bg-primary/20'}`}>
                                                  {message.role === 'user' ? (
                                                    <User className="h-3 w-3 text-primary-foreground" />
                                                  ) : (
                                                    <Bot className="h-3 w-3 text-primary" />
                                                  )}
                                                </div>
                                                <p className="text-sm truncate flex-1">{message.content}</p>
                                              </div>
                                            ))}
                                            
                                            {chat.messages.length > 2 && (
                                              <p className="text-xs text-muted-foreground italic">
                                                + {chat.messages.length - 2} more messages
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()
                        }
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setShowHistoryModal(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat messages area */}
              <div id="qa-content" className="bg-muted/30 backdrop-blur-sm rounded-lg p-4 h-80 overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="bg-primary/10 p-3 rounded-full mb-3">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No questions yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Ask a question about your legal document to get started. Try one of the example questions below.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((message, index) => (
                      <div
                        key={index}
                        data-message="true"
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex items-start gap-3 max-w-[80%] ${
                            message.type === "user"
                              ? "flex-row-reverse"
                              : "flex-row"
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                              message.type === "user" ? "bg-primary" : "bg-primary/20"
                            }`}
                          >
                            {message.type === "user" ? (
                              <User className="h-4 w-4 text-primary-foreground" />
                            ) : (
                              <Bot className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div
                            className={`rounded-lg p-3 text-sm ${
                              message.type === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {message.content || (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-current rounded-full animate-pulse" />
                                <div className="h-2 w-2 bg-current rounded-full animate-pulse animation-delay-200" />
                                <div className="h-2 w-2 bg-current rounded-full animate-pulse animation-delay-500" />
                              </div>
                            )}
                            
                            {/* Add listen button for AI messages */}
                            {message.type === "ai" && message.content && (
                              <div className="flex justify-end mt-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs" 
                                  onClick={() => {
                                    // If the current message is already being played, close it
                                    if (showTTS && displayedAnswer === message.content) {
                                      setShowTTS(false);
                                      // Also stop speech if it's playing
                                      if (window.speechSynthesis) {
                                        window.speechSynthesis.cancel();
                                      }
                                    } else {
                                      // Otherwise, show TTS for this message
                                      setDisplayedAnswer(message.content || "");
                                      setShowTTS(true);
                                    }
                                  }}
                                >
                                  {showTTS && displayedAnswer === message.content ? (
                                    <>
                                      <Pause className="h-3 w-3 mr-1" /> Stop
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" /> Listen
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                            
                            {message.timestamp && (
                              <div className="text-xs mt-1 opacity-70">
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Text-to-Speech component */}
              {showTTS && displayedAnswer && (
                <motion.div
                  className="mb-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextToSpeech text={displayedAnswer} />
                </motion.div>
              )}
              
              {/* Processing indicator */}
              {isProcessing && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between text-sm">
                    <span>Processing question...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </motion.div>
              )}

              {/* Input area */}
              <form onSubmit={handleSubmit} className="relative">
                <Input
                  placeholder="Type your legal question here..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="pr-12 bg-background/50 backdrop-blur-sm"
                  disabled={isProcessing}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1 top-1 h-8 w-8 rounded-full"
                  disabled={!question.trim() || isProcessing}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {/* Always show example questions */}
              <div className="text-sm text-muted-foreground space-y-4">
                {/* Show previous conversations with document names */}
                {previousQuestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <History className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Conversation History</h2>
                      <div className="ml-auto text-sm text-muted-foreground">
                        User ID: {persistentUserId || getUserId()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {previousQuestions.slice(0, 5).map((item: QuestionItem, index) => (
                        <motion.button
                          key={`previous-${index}`}
                          whileHover={{ x: 5, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          className="w-full text-left p-3 rounded-md hover:text-foreground border border-primary/20 flex flex-col"
                          onClick={() => setQuestion(item.question)}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-primary">🔹</span>
                            <span>{item.question}</span>
                          </div>
                          {item.documentName && (
                            <div className="text-xs text-muted-foreground mt-1 ml-6">
                              Asked from: {item.documentName}
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Always show example questions */}
                <div>
                  <p>Example questions:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                    {predefinedQuestions.map((predefinedQuestion, index) => (
                      <motion.button
                        key={`example-${index}`}
                        whileHover={{ x: 5, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        className="text-left p-2 rounded-md hover:text-foreground"
                        onClick={() => setQuestion(predefinedQuestion)}
                      >
                        {predefinedQuestion}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.section>
  )
}
