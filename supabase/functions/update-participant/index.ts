// filepath: /Users/at0794/repos/padel-matcher/supabase/functions/update-participant/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Dynamic CORS
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://exrezzo.github.io",
]);
function corsHeadersFor(req: Request, methods: string[]): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const isLocalGateway = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");
  const allowOrigin = isLocalGateway ? "*" : (origin && ALLOWED_ORIGINS.has(origin) ? origin : "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods.join(", "),
    "Vary": "Origin",
  };
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

type UpdateParticipantBody = {
  id?: string; // participant id
  status?: string; // invited | confirmed | declined
  notes?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req, ["POST", "OPTIONS"]) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const apiKey = serviceRoleKey || anonKey;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in env" }),
        { headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" }, status: 500 }
      );
    }

    const authHeader = req.headers.get("Authorization") || undefined;
    const supabase = createClient(supabaseUrl, apiKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    let body: UpdateParticipantBody = {};
    try { body = (await req.json()) as UpdateParticipantBody; } catch {}

    const url = new URL(req.url);
    const id = (body.id || url.searchParams.get("id") || "").trim();
    const status = (body.status || url.searchParams.get("status") || "").trim();
    const notes = (body.notes || url.searchParams.get("notes") || "").trim();

    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: "'id' (participant id) is required" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!isUuid(id)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid uuid format for id" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const update: Record<string, string> = {};
    if (status) update.status = status;
    if (typeof notes === "string") update.notes = notes; // can be empty string

    if (Object.keys(update).length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Nothing to update" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data, error } = await supabase
      .from("match_participants")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ ok: true, participant: data }), {
      headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = typeof err === "object" && err && "message" in err ? (err as any).message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
      status: 500,
    });
  }
});

