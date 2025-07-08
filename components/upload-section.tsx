"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { Upload, FileText, Check, AlertCircle, FileUp, Trash2, Volume2, Download, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { TextToSpeech } from "@/components/ui/text-to-speech"
import PdfGenerator from "./pdf-generator"
import { BACKEND_URL } from "@/lib/config"
import { extractFileMetadata } from "@/lib/document-utils"
import { useSession } from "next-auth/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DocumentMetadata {
  fingerprint: string;
  name: string;
  size: number;
}

export default function UploadSection() {
  const { data: session, status } = useSession()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showTTS, setShowTTS] = useState(false)
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata | null>(null)
  const [previousQuestions, setPreviousQuestions] = useState<{question: string, timestamp: string}[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showAuthAlert, setShowAuthAlert] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 })
  
  // Initialize auth state on component mount (before the effect runs)
  useEffect(() => {
    // Immediately check if user is already authenticated
    const storedUser = localStorage.getItem('talqs_user');
    if (storedUser || status === 'authenticated') {
      setShowAuthAlert(false);
    }
  }, []) // Empty dependency array means this runs once on mount
  
  // Effect to check authentication status on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('talqs_user');
    const isLocallyAuthenticated = !!storedUser;
    
    // Hide auth alert if user is authenticated by any method
    if (status === 'authenticated' || isLocallyAuthenticated) {
      setShowAuthAlert(false);
    }
  }, [status])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith('.txt')) {
        handleFileUpload(file)
      } else {
        setErrorMessage("Only .txt files are supported")
        setTimeout(() => setErrorMessage(null), 3000)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.name.endsWith('.txt')) {
        handleFileUpload(file)
      } else {
        setErrorMessage("Only .txt files are supported")
        setTimeout(() => setErrorMessage(null), 3000)
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    // Check for both NextAuth and regular authentication
    const storedUser = localStorage.getItem('talqs_user');
    const isAuthenticated = status === 'authenticated' || !!storedUser;
    
    if (!isAuthenticated) {
      setErrorMessage('You must sign in with an account to upload documents');
      setShowAuthAlert(true);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }
    
    // If we're here, the user is authenticated by at least one method
    setShowAuthAlert(false);
    
    setUploadedFile(file)
    setIsUploading(true)
    setUploadSuccess(false)
    setSummary(null)
    setErrorMessage(null)
    setDocumentMetadata(null)
    setPreviousQuestions([])
    setShowAuthAlert(false)

    try {
      // Extract file metadata including fingerprint
      const metadata = await extractFileMetadata(file);
      
      // Get user data from localStorage for authentication
      const storedUser = localStorage.getItem('talqs_user');
      let authToken = '';
      
      if (storedUser) {
        // Create a simple auth token from the user data
        authToken = btoa(storedUser);
      }
      
      // Save document fingerprint to database
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify({
          fingerprint: metadata.fingerprint,
          fileName: metadata.name,
          fileSize: metadata.size,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        if (response.status === 401) {
          setShowAuthAlert(true);
          throw new Error('Authentication required. Please sign in again.');
        } else {
          throw new Error(errorData.error || 'Failed to save document');
        }
      }
      
      // Set document metadata
      const docMetadata = {
        fingerprint: metadata.fingerprint,
        name: metadata.name,
        size: metadata.size,
      };
      
      setDocumentMetadata(docMetadata);
      
      // Fetch previous questions for this document
      await fetchPreviousQuestions(metadata.fingerprint);
      
      // Dispatch custom event to notify other components about the document
      // Include a flag to indicate this is a new document upload that should clear previous conversations
      const documentUploadedEvent = new CustomEvent('documentUploaded', {
        detail: {
          documentMetadata: docMetadata,
          isNewUpload: true // Flag to indicate this is a fresh upload that should clear previous conversations
        }
      });
      
      window.dispatchEvent(documentUploadedEvent);
      
      // Simulate upload progress
      let progress = 0
      const interval = setInterval(() => {
        progress += 5
        setUploadProgress(progress)

        if (progress >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          setUploadSuccess(true)
        }
      }, 200)
    } catch (error) {
      console.error('Error processing file:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process file');
      setIsUploading(false);
    }
  }

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
      }
    } catch (error) {
      console.error('Error fetching previous questions:', error);
      // Don't show error to user, just log it
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  const removeFile = () => {
    setUploadedFile(null)
    setUploadSuccess(false)
    setSummary(null)
    setErrorMessage(null)
    setDocumentMetadata(null)
    setPreviousQuestions([])
  }

  const analyzeDocument = async () => {
    if (!uploadedFile || !documentMetadata) return;
    
    // Check for both NextAuth and regular authentication
    const storedUser = localStorage.getItem('talqs_user');
    const isAuthenticated = status === 'authenticated' || !!storedUser;
    
    if (!isAuthenticated) {
      setErrorMessage('You must sign in with an account to generate summaries');
      setShowAuthAlert(true);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }
    
    setIsAnalyzing(true);
    setErrorMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('fingerprint', documentMetadata.fingerprint);
      
      // Use the internal Next.js API instead of the external backend
      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze document');
      }
      
      const data = await response.json();
      setSummary(data.summary);
      
      // Refresh previous questions after analysis in case new ones were added
      if (documentMetadata.fingerprint) {
        await fetchPreviousQuestions(documentMetadata.fingerprint);
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
      id="upload"
      className="py-20 relative"
    >
      <div className="absolute inset-0 gradient-bg-subtle rounded-3xl -z-10"></div>

      <div className="text-center mb-16">
        <motion.p variants={itemVariants} className="text-sm font-medium text-primary mb-2">
          DOCUMENT UPLOAD
        </motion.p>
        <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
          Upload Legal Documents
        </motion.h2>
        <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
          Upload your legal judgment files to analyze, summarize, and ask questions about them.
        </motion.p>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="max-w-3xl mx-auto premium-card glow-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                Document Upload
              </CardTitle>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <AlertCircle className="h-5 w-5" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 glass shadow-glow-sm">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Upload Section</h4>
                    <p className="text-sm">
                      Drag and drop your legal documents here or click to browse. We support PDF, DOCX, and TXT files up
                      to 50MB.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <CardDescription>Drag and drop your files or click to browse</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              whileHover={{ scale: isDragging ? 1 : 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`upload-dropzone ${isDragging ? "upload-dropzone-active" : "upload-dropzone-inactive"}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".txt"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                <motion.div
                  animate={
                    isDragging
                      ? {
                          y: [0, -10, 0],
                          scale: [1, 1.1, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.5, repeat: isDragging ? Number.POSITIVE_INFINITY : 0 }}
                  className="bg-primary/10 p-4 rounded-full mb-4 glow-primary"
                >
                  <Upload className="h-12 w-12 text-primary" />
                </motion.div>
                <p className="text-lg font-medium mb-2">
                  {isDragging ? "Drop your files here" : "Drag your files here or click to browse"}
                </p>
                <p className="text-sm text-muted-foreground">Supports TXT files only (max 50MB)</p>
              </label>
            </motion.div>

            {showAuthAlert && status !== 'authenticated' && !localStorage.getItem('talqs_user') && (
              <Alert className="mt-4 border-red-500 bg-red-50 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>
                  You must be signed in to upload documents. Please sign in or create an account to continue.
                </AlertDescription>
              </Alert>
            )}
            
            {errorMessage && (
              <motion.div 
                className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm">{errorMessage}</p>
              </motion.div>
            )}

            {isUploading && (
              <motion.div
                className="mt-6 space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </motion.div>
            )}

            {uploadedFile && !isUploading && (
              <motion.div
                className="mt-6 flex items-center p-4 bg-muted/50 backdrop-blur-sm rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mr-4">
                  {uploadSuccess ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                      className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center"
                    >
                      <Check className="h-6 w-6 text-green-500" />
                    </motion.div>
                  ) : (
                    <FileText className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-destructive/10"
                  onClick={removeFile}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {summary && (
              <motion.div
                className="mt-6 p-4 bg-primary/5 backdrop-blur-sm rounded-lg space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-primary">Document Summary</h3>
                  <div className="flex gap-2">
                    <PdfGenerator 
                      contentId="summary-content" 
                      title="Document Summary" 
                      type="summary"
                      buttonClassName="text-xs"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => setShowTTS(prev => !prev)}
                    >
                      <Volume2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Listen</span>
                    </Button>
                  </div>
                </div>
                
                {showTTS ? (
                  <div className="bg-background/50 p-4 rounded-md">
                    <TextToSpeech text={summary} />
                  </div>
                ) : (
                  <div id="summary-content" className="text-sm whitespace-pre-line bg-background/50 p-3 rounded-md max-h-64 overflow-y-auto">
                    {summary}
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Previous Questions Section removed */}
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full btn-premium glow-primary" 
              disabled={isUploading || !uploadedFile || isAnalyzing}
              onClick={analyzeDocument}
            >
              {isAnalyzing ? "Analyzing..." : isUploading ? "Uploading..." : 
               summary ? "Re-analyze Document" : 
               uploadedFile ? "Analyze Document" : "Upload a Document"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.section>
  )
}
