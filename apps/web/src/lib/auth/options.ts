import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { TelegramAuthPayloadSchema } from "@kindred/shared";
import { verifyTelegramPayload } from "./telegram";
import { upsertUser, createFreeSubscription, getSubscription } from "@kindred/db";

declare module "next-auth" {
  interface Session {
    userId: string;
    telegramId: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    telegramId: number;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {},
      async authorize(_, req) {
        // The raw Telegram widget payload is sent as JSON in the request body
        const raw =
          typeof req.body === "object" ? req.body : JSON.parse(req.body ?? "{}");
        const parsed = TelegramAuthPayloadSchema.safeParse(raw);
        if (!parsed.success) return null;

        const payload = verifyTelegramPayload(parsed.data);

        // Upsert user in DB
        const user = await upsertUser({
          telegram_id: payload.id,
          telegram_username: payload.username ?? null,
          first_name: payload.first_name,
          photo_url: payload.photo_url ?? null,
        });

        // Create free subscription if not exists
        const sub = await getSubscription(user.id);
        if (!sub) await createFreeSubscription(user.id);

        return {
          id: user.id,
          name: user.first_name,
          image: user.photo_url,
          // store extras in the object — picked up by jwt callback
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          telegramId: user.telegram_id as any,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.telegramId = (user as any).telegramId;
      }
      return token;
    },
    session({ session, token }) {
      session.userId = token.userId;
      session.telegramId = token.telegramId;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
