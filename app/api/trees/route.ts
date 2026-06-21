import { NextRequest, NextResponse } from 'next/server';
import { dbGetAllTrees, dbCreateTree, TreeInput } from '@/lib/db';

export async function GET() {
  try {
    const trees = await dbGetAllTrees();
    return NextResponse.json(trees);
  } catch (error) {
    console.error('GET /api/trees error:', error);
    return NextResponse.json({ error: 'Failed to fetch trees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TreeInput;

    if (!body.species || !body.plant_year || body.fx === undefined || body.fy === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: species, plant_year, fx, fy' },
        { status: 400 }
      );
    }

    if (body.fx < 0 || body.fx > 1 || body.fy < 0 || body.fy > 1) {
      return NextResponse.json(
        { error: 'fx and fy must be between 0 and 1' },
        { status: 400 }
      );
    }

    const tree = await dbCreateTree(body);
    return NextResponse.json(tree, { status: 201 });
  } catch (error) {
    console.error('POST /api/trees error:', error);
    return NextResponse.json({ error: 'Failed to create tree' }, { status: 500 });
  }
}
