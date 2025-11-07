import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File missing" }, { status: 400 });
    }

    if ((file as any).size && (file as any).size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    // Convert uploaded file to buffer
    const input = Buffer.from(await file.arrayBuffer());

    // Compress and resize
    const image = sharp(input, { failOn: "none" });
    const meta = await image.metadata();

    const maxSide = 1280;
    const scale = Math.min(
      1,
      maxSide / Math.max(meta.width || maxSide, meta.height || maxSide)
    );

    const width = Math.round((meta.width || maxSide) * scale);
    const height = Math.round((meta.height || maxSide) * scale);

    const jpeg = await image
      .resize(width, height, { fit: "inside" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    // Instead of uploading to a CDN, we just return a Base64 image URL
    const base64 = jpeg.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Upload error" },
      { status: 500 }
    );
  }
}
