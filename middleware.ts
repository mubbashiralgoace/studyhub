import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Remove edge runtime to avoid header size limitations
// export const runtime = "edge";

const PUBLIC_PATHS = new Set([
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
]);

const isPublicPath = (pathname: string) => {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname === "/favicon.ico";
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // First, check if cookies are too large BEFORE creating Supabase client
  // This prevents 431 errors from happening
  const allCookies = req.cookies.getAll();
  const cookieSize = allCookies.reduce((total, cookie) => {
    return total + (cookie.name.length + (cookie.value?.length || 0));
  }, 0);

  // If cookies are too large (more than 6KB), clear them immediately
  if (cookieSize > 6000) {
    const res = NextResponse.redirect(new URL("/auth/signin?error=session_expired", req.url));
    // Clear all cookies that might be related to Supabase
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || 
          cookie.name.includes('supabase') || 
          cookie.name.includes('auth-token') ||
          cookie.name.includes('session')) {
        res.cookies.delete(cookie.name);
      }
    });
    return res;
  }

  // Check total header size
  try {
    const headerSize = req.headers.get('cookie')?.length || 0;
    if (headerSize > 7000) {
      const res = NextResponse.redirect(new URL("/auth/signin?error=session_expired", req.url));
      allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
          res.cookies.delete(cookie.name);
        }
      });
      return res;
    }
  } catch (e) {
    // If we can't check headers, continue anyway
  }

  const res = NextResponse.next();
  
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options) {
            // Only set cookie if value is not too large (max 3KB per cookie)
            if (value.length < 3000) {
              res.cookies.set({ name, value, ...options });
            } else {
              console.warn(`Cookie ${name} too large (${value.length} bytes), skipping`);
            }
          },
          remove(name: string, options) {
            res.cookies.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If already signed in, prevent navigating to auth pages
    if (session && PUBLIC_PATHS.has(pathname) && pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!session) {
      const redirectUrl = new URL("/auth/signin", req.url);
      redirectUrl.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error: any) {
    // If there's an error (like 431), clear cookies and redirect to signin
    console.error("Middleware error:", error);
    const errorRes = NextResponse.redirect(new URL("/auth/signin?error=session_error", req.url));
    // Clear all Supabase cookies
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        errorRes.cookies.delete(cookie.name);
      }
    });
    return errorRes;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

