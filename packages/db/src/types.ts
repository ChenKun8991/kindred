export type RelationshipType =
  | "partner"
  | "family"
  | "close_friend"
  | "friend"
  | "colleague"
  | "acquaintance";

export type EventType =
  | "birthday"
  | "anniversary"
  | "meetup"
  | "custom"
  | "reminder";

export type InteractionChannel =
  | "in_person"
  | "whatsapp"
  | "call"
  | "telegram"
  | "email"
  | "other";

export type SubscriptionTier = "free" | "pro";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete";

export type NotificationStatus = "pending" | "processing" | "sent" | "failed";

export interface GiftHistoryEntry {
  date: string;
  item: string;
  occasion: string;
  reaction?: string;
}

export interface User {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  photo_url: string | null;
  timezone: string;
  created_at: string;
  last_seen_at: string | null;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  relationship_type: RelationshipType;
  birthday: string | null;
  first_met_date: string | null;
  first_met_context: string | null;
  last_contact_date: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  hobbies: string[];
  food_preferences: string | null;
  love_language: string | null;
  occupation: string | null;
  personality_notes: string | null;
  gift_history: GiftHistoryEntry[];
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  person_id: string;
  type: EventType;
  title: string;
  date: string;
  recurring: boolean;
  notify_days_before: number[];
  plan_generated: unknown | null;
  notes: string | null;
  created_at: string;
}

export interface Interaction {
  id: string;
  user_id: string;
  person_id: string;
  date: string;
  channel: InteractionChannel;
  notes: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface OauthConnection {
  id: string;
  user_id: string;
  provider: string;
  access_token_enc: string;
  refresh_token_enc: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  event_id: string;
  scheduled_for: string;
  status: NotificationStatus;
  payload: unknown | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at">;
        Update: Partial<Omit<User, "id">>;
        Relationships: never[];
      };
      people: {
        Row: Person;
        Insert: Omit<Person, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Person, "id" | "user_id">>;
        Relationships: never[];
      };
      events: {
        Row: Event;
        Insert: Omit<Event, "id" | "created_at">;
        Update: Partial<Omit<Event, "id" | "user_id">>;
        Relationships: never[];
      };
      interactions: {
        Row: Interaction;
        Insert: Omit<Interaction, "id" | "created_at">;
        Update: Partial<Omit<Interaction, "id" | "user_id">>;
        Relationships: never[];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Subscription, "id" | "user_id">>;
        Relationships: never[];
      };
      oauth_connections: {
        Row: OauthConnection;
        Insert: Omit<OauthConnection, "id" | "created_at">;
        Update: Partial<Omit<OauthConnection, "id" | "user_id">>;
        Relationships: never[];
      };
      notification_queue: {
        Row: NotificationQueue;
        Insert: Omit<NotificationQueue, "id" | "created_at">;
        Update: Partial<Omit<NotificationQueue, "id">>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
