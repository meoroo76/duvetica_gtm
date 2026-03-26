import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

const DATA_KEY = 'duvetica-gtm-data';

interface GTMData {
  tasks: unknown[];
  milestones: unknown[];
  dataVersion?: number;
}

// GET - 저장된 데이터 조회
export async function GET() {
  try {
    const data = await kv.get<GTMData>(DATA_KEY);
    if (!data) {
      return NextResponse.json({ tasks: [], milestones: [], dataVersion: 0 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('KV GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', tasks: [], milestones: [] },
      { status: 500 }
    );
  }
}

// PUT - 데이터 저장
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 인증 체크 (간단한 헤더 기반)
    const authUser = request.headers.get('x-gtm-user');
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: GTMData = {
      tasks: body.tasks || [],
      milestones: body.milestones || [],
      dataVersion: body.dataVersion || 1,
    };

    await kv.set(DATA_KEY, data);

    return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('KV PUT error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
