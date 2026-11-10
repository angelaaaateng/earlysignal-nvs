// Turns a photo (syllabus, team schedule, newsletter) or messy text into event
// candidates with Claude, and fetches calendar links server-side (CORS). The
// parent approves every candidate in the app before anything is saved.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.78.0";

const KINDS = ["test", "tryout", "game", "performance", "project", "presentation", "social", "trip", "other"] as const;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: { kind: "text" | "photo" | "calendar"; text?: string; base64?: string; mediaType?: string; url?: string; today: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID: bad request" }, 400);
  }

  if (body.kind === "calendar") {
    if (!body.url || !/^https?:\/\//i.test(body.url)) return json({ error: "INVALID: That doesn’t look like a calendar link." }, 400);
    const url = body.url.replace(/^webcal:\/\//i, "https://");
    const r = await fetch(url, { headers: { Accept: "text/calendar, text/plain, */*" } });
    if (!r.ok) return json({ error: "INVALID: That link didn’t return a calendar." }, 400);
    const ics = await r.text();
    if (!/BEGIN:VCALENDAR/i.test(ics)) return json({ error: "INVALID: That link isn’t an iCalendar (.ics) feed." }, 400);
    return json({ ics: ics.slice(0, 400_000) });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ configured: false, candidates: [] });
  const client = new Anthropic({ apiKey });

  const content: Anthropic.MessageParam["content"] = [];
  if (body.kind === "photo" && body.base64) {
    content.push({ type: "image", source: { type: "base64", media_type: (body.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif") ?? "image/jpeg", data: body.base64 } });
  }
  content.push({
    type: "text",
    text: `Today is ${body.today}. Extract every dated school or activity event for a kid from this ${body.kind === "photo" ? "image" : "text"}: tests, quizzes, tryouts, games, performances, project due dates, presentations, dances, field trips. Ignore anything without a date. Resolve weekday names and "next week" relative to today; a month-day with no year is the next occurrence. Titles are short (under 60 characters), as a parent would say them.${body.kind === "text" ? `\n\nText:\n${(body.text ?? "").slice(0, 12000)}` : ""}`,
  });

  const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["events"],
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "kind", "date"],
                properties: { title: { type: "string" }, kind: { type: "string", enum: [...KINDS] }, date: { type: "string", description: "YYYY-MM-DD" } },
              },
            },
          },
        },
      },
    },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") return json({ error: "Claude declined to read that. Try pasting the text." }, 400);
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "{}";
  let parsed: { events?: { title: string; kind: string; date: string }[] } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    return json({ error: "Couldn’t read that. Try again or paste the text." }, 400);
  }
  const candidates = (parsed.events ?? [])
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title.trim())
    .map((e) => ({ title: e.title.trim().slice(0, 80), kind: KINDS.includes(e.kind as (typeof KINDS)[number]) ? e.kind : "other", date: e.date, source: body.kind }));
  return json({ configured: true, candidates, usage: { input: response.usage.input_tokens, output: response.usage.output_tokens } });
});
