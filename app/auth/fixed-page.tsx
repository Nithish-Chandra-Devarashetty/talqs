"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { Eye, EyeOff, Github } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

export default function AuthPage() {
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
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4">
      <Toaster />
      
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 min-h-screen"
        style={{
          backgroundImage: "url('/images/talqs-background.jpg')",
          backgroundSize: "cover", 
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#050f1c",
          filter: "brightness(0.4)",
          objectFit: "cover"
        }}
      />
      
      {/* TalQS Logo */}
      <div 
        className="absolute top-6 md:top-10 w-full text-center z-10"
        style={{
          fontSize: "36px",
          fontWeight: "bold",
          color: "#3ba4ff",
          animation: "glow 2s ease-in-out infinite alternate",
        }}
      >
        TalQS
      </div>
      
      {/* Main content container with proper spacing */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center z-20 mt-16 md:mt-20 mb-8">
        
        {/* Auth Card */}
        <motion.div 
          className="w-full max-w-sm sm:max-w-md aspect-auto bg-black/40 backdrop-blur-md rounded-xl shadow-2xl border border-blue-500/20 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-blue-400">
                {activeTab === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-gray-400 mt-2">
                {activeTab === "login" 
                  ? "Sign in to access your account" 
                  : "Fill in your details to get started"}
              </p>
            </div>
            
            {error && (
              <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-md text-red-300 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === "signup" && (
                <div className="space-y-2">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-black/30 border-blue-500/30 focus:border-blue-400 text-white"
                    placeholder="Enter your full name"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/30 border-blue-500/30 focus:border-blue-400 text-white"
                  placeholder="your@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-black/30 border-blue-500/30 focus:border-blue-400 text-white pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              {activeTab === "signup" && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-black/30 border-blue-500/30 focus:border-blue-400 text-white pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="dob" className="block text-sm font-medium text-gray-300">
                      Date of Birth
                    </label>
                    <DatePicker
                      id="dob"
                      selected={dateOfBirth}
                      onChange={(date) => setDateOfBirth(date)}
                      required
                      className="w-full bg-black/30 border border-blue-500/30 focus:border-blue-400 text-white rounded-md p-2"
                      placeholderText="Select your date of birth"
                      showYearDropdown
                      dropdownMode="select"
                      maxDate={new Date()}
                    />
                  </div>
                </>
              )}
              
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white py-2 rounded-md transition duration-300 mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Processing...</span>
                  </div>
                ) : activeTab === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
              
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-blue-500/20"></div>
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
    </div>
  )
}
