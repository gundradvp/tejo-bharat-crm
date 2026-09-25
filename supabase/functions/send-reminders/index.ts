import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEROPO_API_KEY = Deno.env.get("DEROPO_API_KEY") ?? "ca4a5d672838b07f6ea00a7af93bcf3d";
const DEROPO_API_URL = "https://api.deropo.com/api/send";

async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const number = phone.replace(/\D/g, "");
  const response = await fetch(DEROPO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Token": DEROPO_API_KEY,
    },
    body: JSON.stringify({ number, type: "text", message }),
  });
  return response.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: reminders, error: fetchError } = await supabase
      .from("task_reminders")
      .select("*")
      .eq("status", "pending")
      .lte("remind_at", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; status: string; error?: string }[] = [];

    for (const reminder of reminders) {
      try {
        const sent = await sendWhatsAppMessage(reminder.phone, reminder.message);

        if (sent) {
          await supabase
            .from("task_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", reminder.id);
          results.push({ id: reminder.id, status: "sent" });
        } else {
          throw new Error("Deropo API returned an error");
        }
      } catch (err: any) {
        console.error(`Failed to send reminder ${reminder.id}:`, err);
        await supabase
          .from("task_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        results.push({ id: reminder.id, status: "failed", error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process reminders" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
