// filepath: /Users/at0794/repos/padel-matcher/supabase/functions/add-participant/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Dynamic CORS: allow local dev and GitHub Pages; default to '*' for non-browser clients
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

type AddParticipantBody = {
  match_id?: string;
  name?: string;
  status?: string; // invited | confirmed | declined (free text for now)
  notes?: string;
};

Deno.serve(async (req: Request) => {
  // CORS preflight
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

    let body: AddParticipantBody = {};
    try { body = (await req.json()) as AddParticipantBody; } catch { /* ignore */ }

    const url = new URL(req.url);
    const match_id = (body.match_id || url.searchParams.get("match_id") || url.searchParams.get("id") || "").trim();
    const name = (body.name || url.searchParams.get("name") || "").trim();
    const status = (body.status || url.searchParams.get("status") || "not_invited").trim();
    const notes = (body.notes || url.searchParams.get("notes") || "").trim();

    if (!match_id) {
      return new Response(JSON.stringify({ ok: false, error: "'match_id' (uuid) is required" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!isUuid(match_id)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid uuid format for match_id" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!name) {
      return new Response(JSON.stringify({ ok: false, error: "'name' is required" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Ensure match exists
    const { data: match, error: matchErr } = await supabase
      .from("padel_matches")
      .select("id")
      .eq("id", match_id)
      .maybeSingle();

    if (matchErr) {
      return new Response(JSON.stringify({ ok: false, error: matchErr.message }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!match) {
      return new Response(JSON.stringify({ ok: false, error: "Match not found" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Insert participant
    const { data: participant, error: insErr } = await supabase
      .from("match_participants")
      .insert({ match_id, name, status, notes })
      .select("*")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ ok: false, error: insErr.message }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ ok: true, participant }), {
      headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
      status: 201,
    });
  } catch (err) {
    const message = typeof err === "object" && err && "message" in err ? (err as any).message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
