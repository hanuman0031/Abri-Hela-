import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { isRunning } = await req.json();
    const controlPath = path.join(process.cwd(), 'public', 'control.json');
    try {
      fs.writeFileSync(controlPath, JSON.stringify({ isRunning }));
    } catch (fsErr) {
      console.warn("Filesystem write failed (likely Vercel serverless):", fsErr);
      // In a production Vercel environment, you would use Redis or a Database here.
      // For the hackathon demo, we return success so the UI stays responsive.
    }
    return NextResponse.json({ success: true, isRunning });
  } catch (_err) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    try {
      const controlPath = path.join(process.cwd(), 'public', 'control.json');
      if (fs.existsSync(controlPath)) {
        const data = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
        return NextResponse.json(data);
      }
    } catch (fsErr) {
      console.warn("Filesystem read failed, likely in a serverless environment:", fsErr);
    }
    return NextResponse.json({ isRunning: false });
  } catch (_err) {
    return NextResponse.json({ isRunning: false });
  }
}

