"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Clock, FileText, User, Bot, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { useAuth } from "@/lib/auth-context"
import { formatDate } from "@/lib/utils"

interface Conversation {
  id: string
  title: string
  date: string
  messages: {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: string
  }[]
}

interface ConversationHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConversationHistory({ isOpen, onClose }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { data: session } = useSession()
  const { user } = useAuth()
  
  const userId = user?.id || session?.user?.email || ""

  useEffect(() => {
    if (isOpen && userId) {
      fetchConversations()
    }
  }, [isOpen, userId])

  const fetchConversations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/chat/history?userId=${encodeURIComponent(userId)}`)
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        console.error("Failed to fetch conversations")
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteHistory = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch('/api/chat/delete-history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setConversations([])
        setShowDeleteConfirmation(false)
        // Optional: Show success message
      } else {
        throw new Error('Failed to delete chat history')
      }
    } catch (error) {
      console.error('Error deleting history:', error)
      // Optional: Show error message
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleConversation = (conversationId: string) => {
    if (expandedConversation === conversationId) {
      setExpandedConversation(null)
    } else {
      setExpandedConversation(conversationId)
    }
  }

  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    conv.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 pt-20 pb-10"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative mx-auto w-full max-w-3xl rounded-lg bg-white shadow-lg dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with close and delete buttons */}
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">Conversation History</h2>
            <p className="ml-3 text-sm text-gray-500">User ID: {userId}</p>
          </div>
          <div className="flex space-x-2">
            {/* Delete History Button - Top Right */}
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              aria-label="Delete all history"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <span className="ml-3 text-gray-500">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-700">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No conversations found</h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? "Try a different search term" : "Start a new conversation to see it here"}
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div
                  className="flex cursor-pointer items-center justify-between bg-gray-50 p-3 dark:bg-gray-800"
                  onClick={() => toggleConversation(conversation.id)}
                >
                  <div>
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-indigo-500" />
                      <h3 className="font-medium">{conversation.title}</h3>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <span>{conversation.messages.length} messages</span>
                      <span className="mx-2">•</span>
                      <span>{conversation.date}</span>
                    </div>
                  </div>
                  <div className="text-sm text-indigo-500">
                    {expandedConversation === conversation.id ? "Hide" : "View"}
                  </div>
                </div>

                {expandedConversation === conversation.id && (
                  <div className="divide-y border-t dark:divide-gray-700 dark:border-gray-700">
                    {conversation.messages.map((message) => (
                      <div key={message.id} className="p-3">
                        <div className="mb-1 flex items-center">
                          {message.role === "user" ? (
                            <User className="mr-2 h-4 w-4 text-blue-500" />
                          ) : (
                            <Bot className="mr-2 h-4 w-4 text-green-500" />
                          )}
                          <span className="mr-2 text-xs font-medium">
                            {message.role === "user" ? "You" : "TALQS"}
                          </span>
                          <span className="text-xs text-gray-500">{message.timestamp}</span>
                        </div>
                        <div className="pl-6 text-sm">{message.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Close button at bottom */}
        <div className="border-t p-4 text-center dark:border-gray-700">
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
              <div className="mb-4 flex items-center">
                <div className="mr-3 rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold">Delete All Conversations</h3>
              </div>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                Are you sure you want to delete all your conversations? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteHistory}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete All"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
