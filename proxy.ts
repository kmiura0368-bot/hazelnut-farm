import { NextRequest, NextResponse } from 'next/server';

// パスワード保護。APP_PASSWORD が未設定（ローカル開発）の場合は素通しする。
const PUBLIC_PATHS = ['/login', '/api/login'];

export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next(); // 開発時はバイパス

  const { pathname } = req.nextUrl;

  // 公開パス・静的アセットは素通し
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/gallery') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|svg|ico|webmanifest)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get('farm_session')?.value;
  if (session === password) {
    return NextResponse.next();
  }

  // 未認証 → ログイン画面へ
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
