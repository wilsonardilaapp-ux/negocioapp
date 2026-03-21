import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside.
export function middleware(request: NextRequest) {
  // This middleware is a pass-through and does nothing.
  // Its existence is solely to ensure Next.js generates the middleware-manifest.json file,
  // which resolves certain build and server-start errors.
  return NextResponse.next();
}
