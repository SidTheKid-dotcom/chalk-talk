import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';
import {
  type ConnectionDetails,
  createRoomName,
  livekitHttpUrl,
  mintHumanToken,
  parseTokenRequest,
} from '@/lib/token';

export const revalidate = 0;

type TokenEnv = {
  apiKey: string;
  apiSecret: string;
  livekitUrl: string;
  agentName: string;
};

function readEnv(): TokenEnv {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;
  const agentName = process.env.AGENT_NAME;

  if (!livekitUrl) {
    throw new Error('LIVEKIT_URL is not defined');
  }
  if (!apiKey) {
    throw new Error('LIVEKIT_API_KEY is not defined');
  }
  if (!apiSecret) {
    throw new Error('LIVEKIT_API_SECRET is not defined');
  }
  if (!agentName) {
    throw new Error('AGENT_NAME is not defined');
  }

  return { apiKey, apiSecret, livekitUrl, agentName };
}

async function roomExists(env: TokenEnv, roomName: string): Promise<boolean> {
  const client = new RoomServiceClient(livekitHttpUrl(env.livekitUrl), env.apiKey, env.apiSecret);
  const rooms = await client.listRooms([roomName]);
  return rooms.length > 0;
}

export async function GET() {
  return new NextResponse('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
}

export async function POST(req: Request) {
  try {
    const env = readEnv();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = parseTokenRequest(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    let roomName: string;
    if (parsed.role === 'player') {
      roomName = createRoomName();
    } else {
      const exists = await roomExists(env, parsed.room);
      if (!exists) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      roomName = parsed.room;
    }

    const minted = await mintHumanToken({
      apiKey: env.apiKey,
      apiSecret: env.apiSecret,
      role: parsed.role,
      roomName,
      agentName: parsed.role === 'player' ? env.agentName : undefined,
    });

    const data: ConnectionDetails = {
      serverUrl: env.livekitUrl,
      roomName,
      participantName: minted.participantName,
      participantToken: minted.token,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
