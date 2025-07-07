import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs"
import client from "@/lib/db";
// import { userSchema } from "@/types/schema";
// import { NextResponse } from "next/server";
import { Session } from "next-auth";


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        name: { label: "Name", type: "text", placeholder: "Siddharth" },
        email: { label: "Email", type: "text", placeholder: "sid@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Record<string, string> | undefined): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await client.$connect();
        try {
          const user = await client.user.findUnique({
            where: {
                 email: credentials.email }
          });

          if (!user) throw new Error("No user found with this email");

          if (!user.password) {
            throw new Error("This account doesn't have a passwor. Please sign in with Google.");
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!passwordMatch) throw new Error("Incorrect password");

          return user;
        } catch (e: unknown) {
          console.error("Authorize Error:", e);
          const errorMessage = e instanceof Error ? e.message : "Authorization failed";
          throw new Error(errorMessage);

        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Session["user"] & { id: string }).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    }
  },
  // pages: {
  //   signIn: "/signin"
  // },

  //till i start w frontend this will be commented out
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET
};
