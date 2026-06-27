import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
}

const TABLES_TO_CLEAR = [
  "interview_report",
  "interview_messages",
  "interview_sessions",
  "interview_questions",
  "interview_configs",
  "mirai_stances",
  "chats",
  "bill_contents",
  "bills_tags",
  "bills",
  "tags",
  "diet_sessions",
] as const;

export async function clearAllData(supabase: AdminClient) {
  console.log("🧹 Clearing existing data...");

  for (const table of TABLES_TO_CLEAR) {
    await supabase.from(table).delete().gte("created_at", "1900-01-01");
  }

  const { data: allProviders } =
    await supabase.auth.admin.customProviders.listProviders();
  allProviders.providers.forEach(async (provider) => {
    const { error } = await supabase.auth.admin.customProviders.deleteProvider(
      provider.identifier,
    );
    if (error != null) {
      throw error;
    }
  });

  console.log("✅ Cleared existing data");
}
