import { NextRequest, NextResponse } from "next/server";

// Set these in .env.local
const VLM_BASE_URL =
  process.env.VLM_BASE_URL || "https://router.huggingface.co/v1";
const VLM_API_KEY = "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"; // hf_... token with Inference Providers permission

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.model || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid payload: model and messages are required." },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${VLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.6,
        max_tokens: body.max_tokens ?? 800,
        top_p: body.top_p ?? 1,
        stream: false,
      }),
    });

    const text = await upstream.text();
    const contentType =
      upstream.headers.get("Content-Type") || "application/json";
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
