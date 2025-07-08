import { useState, useEffect } from 'react';

export interface DocumentMetadata {
  fingerprint: string;
  name: string;
  size: number;
}

export interface Question {
  question: string;
  timestamp: string;
}

export function useDocumentFingerprint() {
  const [currentDocument, setCurrentDocument] = useState<DocumentMetadata | null>(null);
  const [previousQuestions, setPreviousQuestions] = useState<Question[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Listen for document upload events
  useEffect(() => {
    const handleDocumentUploaded = (event: CustomEvent) => {
      if (event.detail && event.detail.documentMetadata) {
        setCurrentDocument(event.detail.documentMetadata);
        fetchPreviousQuestions(event.detail.documentMetadata.fingerprint);
      }
    };
    
    // Add event listener for document uploads
    window.addEventListener('documentUploaded' as any, handleDocumentUploaded);
    
    return () => {
      window.removeEventListener('documentUploaded' as any, handleDocumentUploaded);
    };
  }, []);

  // Fetch previous questions for a document
  const fetchPreviousQuestions = async (fingerprint: string) => {
    try {
      setIsLoadingHistory(true);
      
      // Fetch chat history for this document fingerprint
      const response = await fetch(`/api/chat-history?fingerprint=${fingerprint}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch question history');
      }
      
      const data = await response.json();
      
      if (data.chatHistories && data.chatHistories.length > 0) {
        // Extract user questions from chat histories
        const questions = data.chatHistories.flatMap((history: any) => {
          return history.messages
            .filter((msg: any) => msg.role === 'user')
            .map((msg: any) => ({
              question: msg.content,
              timestamp: new Date(msg.timestamp).toLocaleString(),
            }));
        });
        
        setPreviousQuestions(questions);
      } else {
        setPreviousQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching previous questions:', error);
      setPreviousQuestions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Add a new question to the history
  const addQuestion = (question: string) => {
    setPreviousQuestions(prev => [
      { 
        question, 
        timestamp: new Date().toLocaleString() 
      },
      ...prev
    ]);
  };

  // Save a message to chat history
  const saveMessage = async (role: 'user' | 'ai', content: string) => {
    if (!currentDocument) return;
    
    try {
      await fetch('/api/chat-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          content,
          documentId: `doc-${currentDocument.fingerprint.substring(0, 8)}`,
          documentName: currentDocument.name,
          documentFingerprint: currentDocument.fingerprint,
        }),
      });
      
      // If this is a user question, add it to previous questions
      if (role === 'user') {
        addQuestion(content);
      }
    } catch (error) {
      console.error('Error saving to chat history:', error);
    }
  };

  return {
    currentDocument,
    setCurrentDocument,
    previousQuestions,
    isLoadingHistory,
    fetchPreviousQuestions,
    addQuestion,
    saveMessage
  };
}
