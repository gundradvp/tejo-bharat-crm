import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEROPO_API_KEY = "ca4a5d672838b07f6ea00a7af93bcf3d";
const DEROPO_API_URL = "https://api.deropo.com/api/send";
const TEST_NUMBER = "919479797947";

interface TaskNotification {
  taskId: string;
  isNew: boolean;
  assignedToEmail?: string;
  assignedToName?: string;
  assignedToPhone?: string;
  taskTitle: string;
  taskType: string;
  priority: string;
  dueDate?: string;
  customerNames: string[];
}

async function sendButtonsMessage(number: string, message: string, buttons: { text: string }[], footer?: string): Promise<boolean> {
  const body: Record<string, unknown> = {
    number,
    type: "buttons",
    message,
    variables: {
      buttons,
      ...(footer ? { footer } : {}),
    },
  };

  const response = await fetch(DEROPO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Token": DEROPO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Deropo API error:", response.status, text);
  }
  return response.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const notification: TaskNotification = await req.json();

    const taskTypeLabel = notification.taskType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const priorityLabel = notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1);
    const duePart = notification.dueDate
      ? `\nDue: ${new Date(notification.dueDate).toLocaleDateString("en-IN")}`
      : "";
    const customersPart = notification.customerNames.length > 0
      ? `\nCustomers: ${notification.customerNames.join(", ")}`
      : "";

    const message =
      `${notification.isNew ? "New Task Assigned" : "Task Updated"}: *${notification.taskTitle}*\n` +
      `Assigned to: ${notification.assignedToName || "Team Member"}\n` +
      `Type: ${taskTypeLabel} | Priority: ${priorityLabel}` +
      `${customersPart}${duePart}`;

    const buttons = [
      { text: "View Task" },
      { text: "Mark Done" },
      { text: "Need Help" },
    ];

    const sent = await sendButtonsMessage(TEST_NUMBER, message, buttons, "Solar CRM Notification");

    // Also send to the assigned employee's phone if available
    let employeeSent = false;
    if (notification.assignedToPhone) {
      const phone = notification.assignedToPhone.replace(/\D/g, "");
      const dialCode = phone.startsWith("91") ? phone : `91${phone}`;
      employeeSent = await sendButtonsMessage(dialCode, message, buttons, "Solar CRM Notification");
    }

    return new Response(
      JSON.stringify({
        success: sent,
        testNumberSent: sent,
        employeeSent,
        details: { to: TEST_NUMBER, employee: notification.assignedToPhone },
      }),
      {
        status: sent ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-task-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
