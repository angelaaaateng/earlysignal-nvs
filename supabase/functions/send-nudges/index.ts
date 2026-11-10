// Runs hourly (pg_cron → pg_net). Finds parents whose reminder hour it is, in
// their time zone, and sends one web push each: tonight's kid and event, never
// the question text or anything a kid said. VAPID keys live in Supabase Vault.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const KIND_WORD: Record<string, string> = { test: "test", tryout: "tryout", game: "game", performance: "performance", project: "project", presentation: "presentation", social: "plans", trip: "trip", other: "day" };

Deno.serve(async (req: Request) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: secrets, error: secErr } = await supabase.schema("vault").from("decrypted_secrets").select("name, decrypted_secret").in("name", ["vapid_public", "vapid_private", "cron_secret"]);
  if (secErr) return new Response(JSON.stringify({ error: secErr.message }), { status: 500 });
  const sec = Object.fromEntries((secrets ?? []).map((s: { name: string; decrypted_secret: string }) => [s.name, s.decrypted_secret]));
  if (req.headers.get("x-cron-secret") !== sec.cron_secret) return new Response("forbidden", { status: 403 });
  if (!sec.vapid_public || !sec.vapid_private) return new Response(JSON.stringify({ error: "VAPID keys missing from Vault" }), { status: 500 });
  webpush.setVapidDetails("mailto:hello@rooted.family", sec.vapid_public, sec.vapid_private);

  const { data: targets, error } = await supabase.rpc("nudge_targets");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const sent: string[] = [];
  const dead: string[] = [];
  const nudged = new Set<string>();
  for (const t of (targets ?? []) as { parent_id: string; kid_name: string; event_title: string | null; event_kind: string | null; event_date: string | null; endpoint: string; p256dh: string; auth: string }[]) {
    const body = t.event_title
      ? `${t.kid_name}’s ${KIND_WORD[t.event_kind ?? "other"]} is ${t.event_date === new Date().toISOString().slice(0, 10) ? "today" : "this week"}. Tap for one question about it.`
      : `One question for ${t.kid_name} tonight. Two minutes, in the car or at dinner.`;
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify({ title: `Tonight with ${t.kid_name}`, body, url: "/home" }), { TTL: 3600 });
      sent.push(t.endpoint);
      nudged.add(t.parent_id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) dead.push(t.endpoint);
    }
  }
  if (nudged.size) await supabase.rpc("mark_nudged", { p_parent_ids: [...nudged] });
  if (dead.length) await supabase.rpc("drop_push_subscriptions", { p_endpoints: dead });
  return new Response(JSON.stringify({ sent: sent.length, dropped: dead.length }), { headers: { "Content-Type": "application/json" } });
});
