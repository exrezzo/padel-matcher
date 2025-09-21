// filepath: /Users/at0794/repos/padel-matcher/supabase/functions/get-match/index.ts
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Basic CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function isUuid(id: string): boolean {
  // Accept generic UUIDs (v1-v5)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("uuid") ?? "";

    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: "Missing ?id=<uuid>" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!isUuid(id)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid uuid format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const apiKey = serviceRoleKey || anonKey;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in env" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const authHeader = req.headers.get("Authorization") || undefined;

    const supabase = createClient(supabaseUrl, apiKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Fetch the match and nested participants
    const { data, error } = await supabase
      .from("padel_matches")
      .select(
        "id,name,status,created_at,match_participants(id,name,status,created_at)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ ok: false, error: "Not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    return new Response(JSON.stringify({ ok: true, match: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = typeof err === "object" && err && "message" in err ? (err as any).message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

