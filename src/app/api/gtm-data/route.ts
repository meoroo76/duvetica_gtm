import { NextRequest, NextResponse } from 'next/server';

const DATA_KEY = 'duvetica-gtm-data';

interface GTMData {
  tasks: unknown[];
  milestones: unknown[];
  seasons?: unknown[];
  dataVersion?: number;
}

// KV 사용 가능 여부 확인
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// KV에서 데이터 가져오기 (직접 REST API 호출)
async function kvGet(): Promise<GTMData | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/${DATA_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const json = await res.json();
  if (!json.result) return null;

  // Upstash returns string, need to parse
  return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
}

// KV에 데이터 저장 (직접 REST API 호출)
async function kvSet(data: GTMData): Promise<boolean> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  const res = await fetch(`${url}/set/${DATA_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return res.ok;
}

// In-memory fallback (서버리스에서 재시작 시 초기화되지만 KV 없을 때 기본 동작)
let memoryStore: GTMData | null = null;

// GET - 저장된 데이터 조회
export async function GET() {
  try {
    if (isKVAvailable()) {
      const data = await kvGet();
      if (data) {
        return NextResponse.json(data);
      }
    }

    // KV 없으면 메모리 스토어 사용
    if (memoryStore) {
      return NextResponse.json(memoryStore);
    }

    return NextResponse.json({ tasks: [], milestones: [], dataVersion: 0 });
  } catch (error) {
    console.error('GET error:', error);
    // 에러 시에도 빈 데이터 반환 (500 대신 200)
    return NextResponse.json({ tasks: [], milestones: [], dataVersion: 0 });
  }
}

// PUT - 데이터 저장
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const authUser = request.headers.get('x-gtm-user');
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: GTMData = {
      tasks: body.tasks || [],
      milestones: body.milestones || [],
      seasons: body.seasons || [],
      dataVersion: body.dataVersion || 1,
    };

    if (isKVAvailable()) {
      const ok = await kvSet(data);
      if (ok) {
        memoryStore = data; // 메모리에도 캐시
        return NextResponse.json({ success: true, storage: 'kv', updatedAt: new Date().toISOString() });
      }
    }

    // KV 실패 또는 미연결 시 메모리에 저장
    memoryStore = data;
    return NextResponse.json({ success: true, storage: 'memory', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
