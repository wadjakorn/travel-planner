import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT strategy so the edge proxy (auth-edge.ts) can verify sessions
  // without needing a DB connection. PrismaAdapter still stores users
  // and accounts in the DB — only session tokens use JWT.
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      // On first sign-in, persist the DB user id into the JWT
      if (user?.id) token.uid = user.id;
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.uid as string },
    }),
  },
  pages: {
    signIn: "/login",
  },
});
