"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { Eye, EyeOff, User, Mail, Lock, Calendar, ArrowRight, Scale, Gavel, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "./auth.css" // Import the custom auth styles

export default function TalqsAuthPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam === "signup" ? "signup" : "login")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const { login, signup, user } = useAuth()

  // NextAuth session
  const { data: session, status } = useSession();

  // Form states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Add keyframes for animations
  useEffect(() => {
    // Add keyframes to the document head
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }

      @keyframes glow {
        from { text-shadow: 0 0 5px #3ba4ff, 0 0 10px #3ba4ff; }
        to { text-shadow: 0 0 15px #00c8ff, 0 0 25px #00c8ff; }
      }
      
      @keyframes gradientBg {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);

    // Clean up
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (tabParam === "signup") {
      setActiveTab("signup")
    } else if (tabParam === "login") {
      setActiveTab("login")
    }
  }, [tabParam])

  useEffect(() => {
    // Redirect if already logged in (custom or NextAuth)
    if (user || session) {
      router.push("/")
    }
  }, [user, session, router])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      if (activeTab === "login") {
        // Login logic
        const success = await login(email, password)
        if (success) {
          toast({
            title: "Login successful",
            description: "Welcome back!",
          })
          router.push("/")
        } else {
          setError("Invalid email or password")
        }
      } else {
        // Signup validation
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setIsSubmitting(false)
          return
        }

        if (!dateOfBirth) {
          setError("Date of birth is required")
          setIsSubmitting(false)
          return
        }

        // Check if user is at least 13 years old
        const today = new Date()
        const birthDate = new Date(dateOfBirth)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }

        if (age < 13) {
          setError("You must be at least 13 years old to sign up")
          setIsSubmitting(false)
          return
        }

        // Signup logic
        const success = await signup(email, password, fullName, dateOfBirth)
        if (success) {
          toast({
            title: "Account created",
            description: "Your account has been created successfully",
          })
          router.push("/")
        } else {
          setError("Failed to create account. Email may already be in use.")
        }
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle social login
  const handleSocialLogin = async (provider: string) => {
    try {
      await signIn(provider, { callbackUrl: "/" })
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err)
      setError(`Failed to sign in with ${provider}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#F5F7FA]">
      <Toaster />
      
      {/* Background with legal theme */}
      <div className="absolute inset-0 z-0 bg-[#F5F7FA]">
        {/* Subtle background image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/images/legal-books-background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.1, /* Very subtle background */
          }}
        />
      </div>
      
      {/* Header with Logo */}
      <div className="absolute top-0 w-full flex items-center justify-center py-6 z-10 bg-[#1E2A38] shadow-md">
        <div className="container max-w-6xl flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#F1C40F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#F1C40F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#F1C40F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-xl font-semibold text-white">TALQ <span className="text-[#F1C40F]">|</span> Legal Assistant</h1>
          </div>
        </div>
      </div>
      
      {/* Auth Card with professional styling */}
      <motion.div 
        className="z-10 w-full max-w-md px-8 py-10 bg-white rounded-lg shadow-lg mt-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          boxShadow: "0 0 15px rgba(0,0,0,0.1)"
        }}
      >
        {/* Tabs for Login/Signup */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            type="button"
            className={`flex-1 py-3 font-medium text-sm ${activeTab === "login" 
              ? "text-[#1E2A38] border-b-2 border-[#2ECC71]" 
              : "text-gray-500 hover:text-[#1E2A38]"}`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 py-3 font-medium text-sm ${activeTab === "signup" 
              ? "text-[#1E2A38] border-b-2 border-[#2ECC71]" 
              : "text-gray-500 hover:text-[#1E2A38]"}`}
            onClick={() => setActiveTab("signup")}
          >
            Sign Up
          </button>
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-[#1E2A38]">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-gray-600 mt-2 text-sm">
            {activeTab === "login" 
              ? "Sign in to access your account" 
              : "Fill in your details to get started"}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-300 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {activeTab === "signup" && (
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-[#1E2A38]">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full pl-10 border-gray-300 focus:border-[#2ECC71] focus:ring focus:ring-[#2ECC71]/20 text-foreground rounded-md dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[#1E2A38]">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 border-gray-300 focus:border-[#2ECC71] focus:ring focus:ring-[#2ECC71]/20 text-foreground rounded-md dark:bg-gray-800 dark:border-gray-700"
                placeholder="your@email.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[#1E2A38]">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 border-gray-300 focus:border-[#2ECC71] focus:ring focus:ring-[#2ECC71]/20 text-[#1E2A38] rounded-md"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 border-gray-300 focus:border-[#2ECC71] focus:ring focus:ring-[#2ECC71]/20 text-foreground rounded-md dark:bg-gray-800 dark:border-gray-700"
              placeholder="your@email.com"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-[#1E2A38]">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-10 border-gray-300 focus:border-[#2ECC71] focus:ring focus:ring-[#2ECC71]/20 text-[#1E2A38] rounded-md"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        {activeTab === "signup" && (
          <>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1E2A38]">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 border-gray-300 focus:border-[#2ECC71] focus:ring focus:ring-[#2ECC71]/20 text-[#1E2A38] rounded-md"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[#1E2A38]">
                Date of Birth
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <DatePicker
                  id="dateOfBirth"
                  selected={dateOfBirth}
                  onChange={(date) => setDateOfBirth(date)}
                  required
                  dateFormat="MM/dd/yyyy"
                  showYearDropdown
                  dropdownMode="select"
                  className="w-full pl-10 p-2 rounded-md border border-gray-300 focus:border-[#2ECC71] focus:ring focus:ring-[#2ECC71]/20 text-[#1E2A38]"
                  placeholderText="Select your date of birth"
                />
              </div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/40 px-2 text-gray-400">Or continue with</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSocialLogin("github")}
              className="flex items-center justify-center gap-2 py-2 px-4 border border-blue-500/30 rounded-md hover:bg-blue-500/10 transition-colors duration-200"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              className="flex items-center justify-center gap-2 py-2 px-4 border border-blue-500/30 rounded-md hover:bg-blue-500/10 transition-colors duration-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center text-sm">
          {activeTab === "login" ? (
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/auth?tab=signup"
                className="text-blue-400 hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link
                href="/auth?tab=login"
                className="text-blue-400 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </motion.div>
      
      <div className="mt-8 text-center text-xs text-gray-500 z-10 max-w-md px-4">
        <p>
          By signing up, you agree to our{" "}
          <Link href="#" className="underline hover:text-gray-400">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline hover:text-gray-400">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
