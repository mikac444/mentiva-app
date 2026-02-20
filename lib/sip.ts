import { createClient } from "@/lib/supabase/server";

/**
 * Fetches the active System Instruction Profile for a user.
 * Returns the prompt text string, or null if no SIP exists.
 */
export async function getActiveSIP(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_instruction_profiles")
    .select("prompt_text")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.prompt_text;
}

/**
 * Fetches the user profile for a user.
 * Returns the profile object, or null if no profile exists.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export type UserProfile = {
  id: string;
  user_id: string;
  journey_stage: "exploring" | "crystallizing" | "executing";
  core_values: string[];
  motivations: string[];
  fears: string[];
  self_narrative: string | null;
  definition_of_success: string | null;
  life_stage: string | null;
  commitments: string[];
  energy_pattern: string;
  available_hours_per_day: number | null;
  preferred_tone: string;
  processing_style: string;
  accountability_style: string;
  onboarding_conversation: any[];
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
