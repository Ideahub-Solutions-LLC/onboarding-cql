export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const report = await req.json();
    console.warn("CSP violation", JSON.stringify(report).slice(0, 8_000));
  } catch {
    // A malformed report should not create another application error.
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
