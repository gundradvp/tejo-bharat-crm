import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? "tejo_bharat_whatsapp_secure_2026";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1. Meta Webhook Verification Challenge (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden: Invalid verification token", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // 2. Incoming Messages & Events from Meta (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[WhatsApp Webhook POST] Received event:", JSON.stringify(body));

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
        Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Extract all message value objects (supports Meta live entry[].changes[].value and Meta test body.value)
      const values: any[] = [];
      if (body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          for (const change of entry.changes || []) {
            if (change.value) values.push(change.value);
          }
        }
      }
      if (body.changes && Array.isArray(body.changes)) {
        for (const change of body.changes) {
          if (change.value) values.push(change.value);
        }
      }
      if (body.value) {
        values.push(body.value);
      }
      if (body.messages && Array.isArray(body.messages)) {
        values.push(body);
      }

      for (const value of values) {
        const contacts = value.contacts || [];
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        // Handle delivery and read receipts (single tick, double tick, blue tick)
        for (const st of statuses) {
          const wamid = st.id;
          const statusVal = st.status; // "sent" | "delivered" | "read" | "failed"
          console.log(`[Status Receipt] Message ${wamid} is now "${statusVal}"`);
          if (wamid && statusVal) {
            await supabase
              .from("whatsapp_messages")
              .update({ status: statusVal })
              .eq("id", wamid);
          }
        }

        for (const msg of messages) {
            const rawPhone = msg.from || ""; // e.g. "919479797947"
            const phone10 = rawPhone.replace(/\D/g, "").slice(-10); // "9479797947"
            let customerName = contacts.find((c: any) => c.wa_id === rawPhone)?.profile?.name || "WhatsApp User";

            let content = "";
            let messageType = msg.type || "text";

            if (msg.type === "text") {
              content = msg.text?.body || "";
            } else if (msg.type === "button") {
              content = msg.button?.text || "";
              messageType = "button_reply";
            } else if (msg.type === "interactive") {
              content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
              messageType = "button_reply";
            } else {
              content = `[${msg.type.toUpperCase()}]`;
            }

            console.log(`[Incoming Message] From: ${phone10} (${customerName}): "${content}"`);

            // Try to look up customer info from lead_prospects or eb_customers
            let scNumber = "";
            let mandalName = "";
            let circleName = "APEPDCL";
            let appliedLoadKw = 3;

            try {
              const { data: pData } = await supabase
                .from("lead_prospects")
                .select("customer_name, sc_number, mandal_name, circle_name, applied_solar_load_kw")
                .ilike("mobile_number", `%${phone10}%`)
                .limit(1)
                .maybeSingle();

              if (pData) {
                if (pData.customer_name) customerName = pData.customer_name;
                scNumber = pData.sc_number || "";
                mandalName = pData.mandal_name || "";
                circleName = pData.circle_name || "APEPDCL";
                appliedLoadKw = pData.applied_solar_load_kw || 3;
              } else {
                const { data: ebData } = await supabase
                  .from("eb_customers")
                  .select("customer_name, sur_name, sc_number, mandal_name, ero_name, connected_load")
                  .or(`mobile_number.ilike.%${phone10}%,phone.ilike.%${phone10}%`)
                  .limit(1)
                  .maybeSingle();

                if (ebData) {
                  customerName = ebData.customer_name || ebData.sur_name || customerName;
                  scNumber = ebData.sc_number || "";
                  mandalName = ebData.mandal_name || "";
                  circleName = ebData.ero_name || "APEPDCL";
                  appliedLoadKw = ebData.connected_load || 3;
                }
              }
            } catch (lookupErr) {
              console.warn("Lead lookup non-fatal error:", lookupErr);
            }

            const isInterested =
              content.includes("సర్వే") ||
              content.toLowerCase().includes("survey") ||
              content.toLowerCase().includes("interested") ||
              content.includes("ఆసక్తి");

            const isStop =
              content.toUpperCase().includes("STOP") ||
              content.includes("ఆసక్తి లేదు") ||
              content.toLowerCase().includes("unsubscribe");

            const chatId = `chat_${phone10}`;
            const msgId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // 1. Upsert into whatsapp_chats
            const { error: chatErr } = await supabase.from("whatsapp_chats").upsert({
              id: chatId,
              customer_name: customerName,
              phone_number: phone10,
              sc_number: scNumber,
              circle_name: circleName,
              mandal_name: mandalName,
              applied_load_kw: appliedLoadKw,
              last_message_text: content,
              last_message_at: new Date().toISOString(),
              last_message_direction: "inbound",
              unread_count: 1,
              status: isStop ? "opt_out" : isInterested ? "open" : "open",
              updated_at: new Date().toISOString(),
            });
            if (chatErr) {
              console.error("[Webhook DB Error] Could not upsert whatsapp_chats:", chatErr);
            }

            // 2. Insert into whatsapp_messages
            const { error: msgErr } = await supabase.from("whatsapp_messages").insert({
              id: msgId,
              chat_id: chatId,
              direction: "inbound",
              type: messageType,
              content: content,
              sender_name: customerName,
              sender_phone: rawPhone,
              receiver_phone: "8121104043",
              status: "delivered",
              created_at: new Date().toISOString(),
            });
            if (msgErr) {
              console.error("[Webhook DB Error] Could not insert whatsapp_messages:", msgErr);
            }

            // 3. Update lead statuses
            if (isInterested) {
              await supabase
                .from("lead_prospects")
                .update({
                  call_status: "interested",
                  remark: `WhatsApp Survey Requested: "${content}" (${new Date().toLocaleDateString("en-IN")})`,
                })
                .ilike("mobile_number", `%${phone10}%`);

              await supabase
                .from("eb_customers")
                .update({
                  call_status: "interested",
                  remark: `WhatsApp Survey Requested: "${content}"`,
                })
                .or(`mobile_number.ilike.%${phone10}%,phone.ilike.%${phone10}%`);
            } else if (isStop) {
              await supabase
                .from("lead_prospects")
                .update({
                  call_status: "not_interested",
                  remark: `WhatsApp Opt-Out: "${content}"`,
                })
                .ilike("mobile_number", `%${phone10}%`);
            }
          }
        }

      return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[WhatsApp Webhook POST Error]:", err);
      return new Response(JSON.stringify({ status: "error", error: err.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
