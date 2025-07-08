"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useSession, signOut } from "next-auth/react"

export type User = {
  id: string
  email: string
  fullName: string
  isAdmin: boolean
  dateOfBirth?: string
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, fullName: string, dateOfBirth: Date) => Promise<boolean>
  logout: () => void
  getAllUsers: () => User[]
  deleteUser: (id: string) => void
  isNextAuthAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Admin credentials
const ADMIN_EMAIL = "admin@talqs.com"
const ADMIN_PASSWORD = "admin123"

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [isNextAuthAuthenticated, setIsNextAuthAuthenticated] = useState(false)

  // Effect to handle NextAuth session changes
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      setIsNextAuthAuthenticated(true)
      
      // Save current theme before updating localStorage
      const currentTheme = localStorage.getItem('talqs-theme-preference')
      const currentThemeCurrent = localStorage.getItem('talqs-theme-current')
      
      // Create a user object from NextAuth session
      const nextAuthUser: User = {
        id: session.user.email,
        email: session.user.email,
        fullName: session.user.name || session.user.email,
        isAdmin: false
      }
      
      // Store NextAuth user in localStorage for API access
      localStorage.setItem("talqs_user", JSON.stringify(nextAuthUser))
      
      // Restore theme preferences after login
      if (currentTheme) {
        localStorage.setItem('talqs-theme-preference', currentTheme)
      }
      if (currentThemeCurrent) {
        localStorage.setItem('talqs-theme-current', currentThemeCurrent)
      }
      
      setUser(nextAuthUser)
    } else {
      setIsNextAuthAuthenticated(false)
      
      // If no NextAuth session, check for local user
      const storedUser = localStorage.getItem("talqs_user")
      if (storedUser && !user) {
        setUser(JSON.parse(storedUser))
      }
    }
  }, [session, status])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Admin login
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser = {
        id: "admin-1",
        email: ADMIN_EMAIL,
        fullName: "Admin User",
        isAdmin: true,
      }
      setUser(adminUser)
      localStorage.setItem("talqs_user", JSON.stringify(adminUser))
      return true
    }

    // Regular user login
    const users = JSON.parse(localStorage.getItem("talqs_users") || "[]")
    const foundUser = users.find((u: any) => u.email === email)

    if (foundUser && foundUser.password === password) {
      const { password, ...userWithoutPassword } = foundUser
      setUser(userWithoutPassword)
      localStorage.setItem("talqs_user", JSON.stringify(userWithoutPassword))
      return true
    }

    return false
  }

  const signup = async (email: string, password: string, fullName: string, dateOfBirth: Date): Promise<boolean> => {
    try {
      // Check if email already exists
      const users = JSON.parse(localStorage.getItem("talqs_users") || "[]")
      if (users.some((u: any) => u.email === email)) {
        return false
      }

      // Create new user
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        fullName, // Note: fullName in context, but name in MongoDB
        password,
        dateOfBirth: dateOfBirth.toISOString(),
        isAdmin: false,
      }

      // Save to localStorage
      users.push(newUser)
      localStorage.setItem("talqs_users", JSON.stringify(users))

      // Log in the new user
      const { password: _, ...userWithoutPassword } = newUser
      setUser(userWithoutPassword)
      localStorage.setItem("talqs_user", JSON.stringify(userWithoutPassword))

      // ALSO save to MongoDB via API
      console.log('Saving user to MongoDB:', { email, name: fullName, password, dateOfBirth })
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: fullName, // MongoDB expects 'name', not 'fullName'
          password,
          dateOfBirth: dateOfBirth.toISOString(),
        }),
      })

      if (!response.ok) {
        console.error('Failed to save user to MongoDB:', await response.text())
        // Still return true since localStorage signup succeeded
      } else {
        console.log('User successfully saved to MongoDB')
      }

      return true
    } catch (error) {
      console.error('Error during signup:', error)
      return false
    }
  }

  const logout = () => {
    // Clear local user state
    setUser(null)
    localStorage.removeItem("talqs_user")
    
    // If using NextAuth, also sign out from there
    if (isNextAuthAuthenticated) {
      signOut({ callbackUrl: '/' })
    }
    
    // Reset NextAuth authentication state
    setIsNextAuthAuthenticated(false)
  }

  const getAllUsers = (): User[] => {
    const users = JSON.parse(localStorage.getItem("talqs_users") || "[]")
    return users.map((u: any) => {
      const { password, ...userWithoutPassword } = u
      return userWithoutPassword
    })
  }

  const deleteUser = (id: string) => {
    const users = JSON.parse(localStorage.getItem("talqs_users") || "[]")
    const updatedUsers = users.filter((u: any) => u.id !== id)
    localStorage.setItem("talqs_users", JSON.stringify(updatedUsers))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        getAllUsers,
        deleteUser,
        isNextAuthAuthenticated
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
