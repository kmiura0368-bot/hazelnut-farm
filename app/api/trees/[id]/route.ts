import { NextRequest, NextResponse } from 'next/server';
import { dbGetTree, dbUpdateTree, dbDeleteTree, TreeInput } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const tree = await dbGetTree(id);
    if (!tree) {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    }
    return NextResponse.json(tree);
  } catch (error) {
    console.error('GET /api/trees/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json() as Partial<TreeInput>;
    const tree = await dbUpdateTree(id, body);
    if (!tree) {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    }
    return NextResponse.json(tree);
  } catch (error) {
    console.error('PUT /api/trees/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update tree' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const success = await dbDeleteTree(id);
    if (!success) {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/trees/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete tree' }, { status: 500 });
  }
}
