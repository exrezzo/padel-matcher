// filepath: /Users/at0794/repos/padel-matcher/supabase/functions/create-match/index.ts
// Setup type definitions for built-in Supabase Runtime APIs
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
  const allowOrigin = isLocalGateway
    ? "*" // make dev easy
    : (origin && ALLOWED_ORIGINS.has(origin) ? origin : "*");
  console.log(`Origin: ${allowOrigin}`);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods.join(", "),
    "Vary": "Origin",
  };
}

type CreateMatchBody = {
  title?: string;
  status?: string; // e.g., pending | scheduled | completed
  participants?: { name: string; status?: string }[];
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

    let body: CreateMatchBody = {};
    try {
      body = (await req.json()) as CreateMatchBody;
    } catch (_) {
      // ignore; handled by validation below
    }

    const title = (body.title || "").trim();
    const status = (body.status || "pending").trim();
    const participants = Array.isArray(body.participants) ? body.participants : [];

    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: "'title' is required" }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create the match
    const { data: match, error: matchError } = await supabase
      .from("padel_matches")
      .insert({ title, status })
      .select("*")
      .single();

    if (matchError) {
      return new Response(JSON.stringify({ ok: false, error: matchError.message }), {
        headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" },
        status: 500,
      });
    }

    let insertedParticipants: any[] = [];
    if (participants.length > 0) {
      const cleaned = participants
        .map((p) => ({ name: (p?.name || "").trim(), status: (p?.status || "invited").trim() }))
        .filter((p) => p.name.length > 0)
        .map((p) => ({ ...p, match_id: match.id }));

      if (cleaned.length > 0) {
        const { data: pData, error: pErr } = await supabase
          .from("match_participants")
          .insert(cleaned)
          .select("*");

        if (pErr) {
          // If participants insertion fails, still return the created match, but include the error.
          return new Response(
            JSON.stringify({ ok: true, match, participants_error: pErr.message }),
            { headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" }, status: 201 }
          );
        }
        insertedParticipants = pData ?? [];
      }
    }

    // Optionally fetch nested view
    const { data: full, error: fullErr } = await supabase
      .from("padel_matches")
      .select("id,title,status,created_at,match_participants(id,name,status,created_at)")
      .eq("id", match.id)
      .maybeSingle();

    if (!full || fullErr) {
      return new Response(
        JSON.stringify({ ok: true, match, match_participants: insertedParticipants }),
        { headers: { ...corsHeadersFor(req, ["POST", "OPTIONS"]), "Content-Type": "application/json" }, status: 201 }
      );
    }

    return new Response(JSON.stringify({ ok: true, match: full }), {
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
