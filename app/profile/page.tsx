"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { User as AuthUser } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { FileText, Settings, History, User, Mail, LogOut } from "lucide-react"
import Link from "next/link"

// Define types for our application
interface UserProfile {
  fullName: string;
  email: string;
  createdAt: Date;
  lastLogin: Date;
}

interface Document {
  fingerprint: string;
  fileName?: string;
  uploadedAt: string | Date;
}

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string | Date;
}

interface ChatHistory {
  documentName?: string;
  messages?: ChatMessage[];
}

interface QuestionItem {
  question: string;
  timestamp: Date;
  documentName: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    createdAt: new Date(),
    lastLogin: new Date()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [documentCount, setDocumentCount] = useState(0)
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([])
  const [recentQuestions, setRecentQuestions] = useState<QuestionItem[]>([])

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Load user profile data
  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated" && !user) {
      router.push("/auth?tab=login")
      return
    }

    // Get user data from session or local auth
    const userData = session?.user || user || {}
    
    // Format the data - handle different user types (NextAuth session user vs custom auth user)
    let displayName = "User"
    if (session?.user) {
      // NextAuth user
      displayName = session.user.name || session.user.email || "User"
    } else if (user) {
      // Custom auth user
      displayName = user.fullName || user.email || "User"
    }
    
    setUserProfile({
      fullName: displayName,
      email: userData?.email || "No email provided",
      createdAt: new Date(),
      lastLogin: new Date()
    })

    // Load recent documents
    fetchDocuments()
    
    // Load recent questions
    fetchQuestions()

    setIsLoading(false)
  }, [status, session, user, router])

  // Fetch user documents
  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data = await response.json()
        setDocumentCount(data.documents?.length || 0)
        setRecentDocuments(data.documents?.slice(0, 5) || [] as Document[])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    }
  }

  // Fetch recent questions
  const fetchQuestions = async () => {
    try {
      const response = await fetch("/api/chat-history")
      if (response.ok) {
        const data = await response.json()
        
        // Extract questions from chat histories
        let allQuestions: QuestionItem[] = []
        data.chatHistories?.forEach((history: ChatHistory) => {
          const userMessages = history.messages?.filter((msg: ChatMessage) => msg.role === "user") || []
          allQuestions.push(...userMessages.map((msg: ChatMessage) => ({
            question: msg.content,
            timestamp: new Date(msg.timestamp),
            documentName: history.documentName || "Unknown document"
          })))
        })
        
        // Sort by most recent
        allQuestions.sort((a: QuestionItem, b: QuestionItem) => b.timestamp.getTime() - a.timestamp.getTime())
        setRecentQuestions(allQuestions.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      })
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <Toaster />
      
      <div className="mb-6">
        <Link href="/" className="text-primary hover:underline flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left sidebar - User info */}
        <div className="w-full md:w-1/3">
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-4 pb-6 space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={session?.user?.image || ""} alt={userProfile.fullName} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {getInitials(userProfile.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{userProfile.fullName}</h3>
                <p className="text-sm text-muted-foreground">{userProfile.email}</p>
              </div>
              <div className="w-full flex flex-col space-y-3 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Documents
                  </span>
                  <span className="font-medium">{documentCount}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <History className="h-4 w-4 mr-2" />
                    Member Since
                  </span>
                  <span className="font-medium">
                    {userProfile.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Account Status
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">Active</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pb-6">
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Right tabs section - Profile details */}
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            {/* Account Tab */}
            <TabsContent value="account" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input 
                      id="name" 
                      value={userProfile.fullName} 
                      onChange={(e) => setUserProfile({...userProfile, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input 
                      id="email" 
                      value={userProfile.email} 
                      disabled={!!session?.user}
                      onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    />
                    {session?.user && (
                      <p className="text-xs text-muted-foreground">Email cannot be changed for OAuth accounts</p>
                    )}
                  </div>
                  

                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={() => {
                    toast({
                      title: "Profile Updated",
                      description: "Your profile has been updated successfully.",
                    })
                  }}>Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Documents</CardTitle>
                  <CardDescription>View and manage your uploaded documents</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentDocuments.length > 0 ? (
                    <div className="space-y-4">
                      {recentDocuments.map((doc: any, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-primary" />
                            <div>
                              <h4 className="font-medium">{doc.fileName || "Unnamed Document"}</h4>
                              <p className="text-xs text-muted-foreground">
                                Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => {
                            router.push(`/#qa?document=${doc.fingerprint}`)
                          }}>
                            Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                      <p className="text-muted-foreground">No documents found</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => router.push("/#upload")}
                      >
                        Upload a Document
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="justify-center">
                  {recentDocuments.length > 0 && (
                    <Button variant="outline" onClick={() => router.push("/#upload")}>
                      Upload New Document
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent questions and interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {recentQuestions.map((item: any, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 text-primary p-2 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                <path d="M12 17h.01"/>
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{item.question}</p>
                              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>Document: {item.documentName}</span>
                                <span>{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground opacity-50 mb-4">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <path d="M8 9h8"/>
                        <path d="M8 13h6"/>
                      </svg>
                      <p className="text-muted-foreground">No recent questions found</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => router.push("/#qa")}
                      >
                        Ask a Question
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
