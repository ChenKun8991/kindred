import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { upsertUser, createFreeSubscription, getSubscription, getServiceClient } from "@kindred/db";

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
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        const supabase = getServiceClient();
        const { data, error } = await supabase
          .from("login_tokens")
          .select("token, telegram_id, telegram_data, verified_at, expires_at")
          .eq("token", credentials.token)
          .maybeSingle();

        if (error || !data || !data.verified_at) return null;
        if (new Date(data.expires_at) < new Date()) return null;

        const tg = data.telegram_data as {
          id: number;
          first_name: string | null;
          last_name: string | null;
          username: string | null;
        };

        const user = await upsertUser({
          telegram_id: tg.id,
          telegram_username: tg.username ?? null,
          first_name: tg.first_name ?? "User",
          photo_url: null,
        });

        const sub = await getSubscription(user.id);
        if (!sub) await createFreeSubscription(user.id);

        // delete the token so it can't be reused
        await supabase.from("login_tokens").delete().eq("token", credentials.token);

        return {
          id: user.id,
          name: user.first_name,
          image: user.photo_url,
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
