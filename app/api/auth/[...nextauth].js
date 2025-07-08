// This file is deprecated and replaced by app/api/auth/[...nextauth]/route.js
// Please use the new App Router convention for NextAuth API routes.

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    }),
  ],
  // You can add more NextAuth config here if needed
});

export { handler as GET, handler as POST };
