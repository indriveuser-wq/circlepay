import { supabase } from "@/integrations/supabase/client";
import { db, type Profile } from "./db";
import { updateProfile } from "./mutations";
import { isOnline } from "./sync";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, "");
}

/** Returns an error message, or null when the username is well-formed. */
export function validateUsername(raw: string): string | null {
  const value = normalizeUsername(raw);
  if (!value) return "Enter a username.";
  if (value.length < 3) return "Usernames need at least 3 characters.";
  if (value.length > 20) return "Usernames can be at most 20 characters.";
  if (!USERNAME_PATTERN.test(value))
    return "Use only lowercase letters, numbers and underscores.";
  return null;
}

type Row = {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  currency: string | null;
};

function toProfile(row: Row): Profile {
  return {
    id: row.id,
    name: row.name ?? "",
    username: row.username,
    avatar_url: row.avatar_url,
    bio: null,
    email: null,
    phone: null,
    currency: row.currency ?? "NPR",
    timezone: "Asia/Kathmandu",
    notify_in_app: true,
    notify_push: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Exact-match username lookup. Checks the local cache first so it keeps
 * working offline, then falls back to the server.
 */
export async function findProfileByUsername(raw: string): Promise<Profile | null> {
  const value = normalizeUsername(raw);
  if (!value) return null;

  const local = await db.profiles.filter((p) => (p.username ?? "").toLowerCase() === value).first();
  if (local) return local;

  if (!isOnline()) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, username, avatar_url, currency")
    .ilike("username", value)
    .maybeSingle();
  if (error || !data) return null;

  const profile = toProfile(data as Row);
  await db.profiles.put(profile);
  return profile;
}

/** True when nobody else holds this username. */
export async function isUsernameAvailable(raw: string, selfId: string): Promise<boolean> {
  const found = await findProfileByUsername(raw);
  return !found || found.id === selfId;
}

/** Validates + reserves a username for the current user. Throws with a message. */
export async function changeUsername(userId: string, raw: string): Promise<string> {
  const problem = validateUsername(raw);
  if (problem) throw new Error(problem);
  const value = normalizeUsername(raw);

  if (!isOnline()) throw new Error("Connect to the internet to change your username.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ username: value })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") throw new Error("That username is already taken.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("Could not update your username.");

  await updateProfile(userId, { username: value });
  return value;
}
