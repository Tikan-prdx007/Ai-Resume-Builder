import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/Resume';

export async function GET() {
  try {
    await dbConnect();
    const resumes = await Resume.find({});
    return NextResponse.json({ success: true, data: resumes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const resume = await Resume.create(body);
    return NextResponse.json({ success: true, data: resume }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}