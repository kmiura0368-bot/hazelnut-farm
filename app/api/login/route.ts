import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expected = process.env.APP_PASSWORD;

    if (!expected) {
      // 開発環境などパスワード未設定時は常に許可
      return NextResponse.json({ success: true });
    }

    if (password !== expected) {
      return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('farm_session', expected, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60日
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 });
  }
}
