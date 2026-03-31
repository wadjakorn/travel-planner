/**
 * Edge-compatible NextAuth config used ONLY in middleware.
 * Does NOT import Prisma — uses JWT strategy for session detection.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
