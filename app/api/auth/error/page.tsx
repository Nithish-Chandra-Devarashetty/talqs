"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [errorMessage, setErrorMessage] = useState<string>("") 
  const [errorTitle, setErrorTitle] = useState<string>("Authentication Error")

  useEffect(() => {
    // Parse the error code and set appropriate messages
    switch (error) {
      case "Callback":
        setErrorMessage("There was a problem with the OAuth callback. Please check your application settings.")
        break
      case "AccessDenied":
        setErrorTitle("Access Denied")
        setErrorMessage("You denied access to your account. Please try again and approve the permissions.")
        break
      case "OAuthSignin":
        setErrorMessage("There was a problem with the OAuth signin process. Please try again.")
        break
      case "OAuthCallback":
        setErrorMessage("There was a problem with the OAuth callback. Please check your redirect URI settings.")
        break
      case "OAuthCreateAccount":
        setErrorMessage("There was a problem creating your account through OAuth. Please try again.")
        break
      case "EmailCreateAccount":
        setErrorMessage("There was a problem creating your account with email. Please try a different email.")
        break
      case "Verification":
        setErrorTitle("Verification Required")
        setErrorMessage("The verification link may have expired or already been used. Please request a new one.")
        break
      case "Configuration":
        setErrorMessage("There is a problem with the server configuration. Please contact support.")
        break
      default:
        setErrorMessage("An unexpected authentication error occurred. Please try again later.")
    }
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background/90 to-background/80">
      <motion.div 
        className="max-w-md w-full bg-card/80 backdrop-blur-md shadow-xl rounded-xl overflow-hidden border border-border/50 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold">{errorTitle}</h1>
          
          <p className="text-muted-foreground">{errorMessage}</p>
          
          <div className="border-t border-border w-full my-4 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              If this issue persists, please check your GitHub/Google credentials and redirect URI settings in your .env.local file.
            </p>
            
            <Link 
              href="/auth" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
