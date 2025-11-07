import { NextResponse } from "next/server";

const HF_API_KEY = process.env.NEXT_PUBLIC_HF_TOKEN; // add to .env.local
const MODEL = "black-forest-labs/FLUX.1-schnell"; // an actual image model

export async function POST(req: Request) {
  try {
    const { prompt, width, height } = await req.json();

    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: width || 1024,
            height: height || 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `HF error ${response.status}: ${text}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:image/png;base64,${base64}`;

    return NextResponse.json({ image: dataUri });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
