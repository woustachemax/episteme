import { getToken } from 'next-auth/jwt'
import { NextResponse, NextRequest } from 'next/server'
 
export async function middleware(request: NextRequest) {
    const token = await getToken({req: request})
    const url =  request.nextUrl
    
    if(token && (
        url.pathname.startsWith('/signin') ||
        url.pathname.startsWith('/signup')
    )){
        return NextResponse.redirect(new URL('/home', request.url) )
    }
    
    const response = NextResponse.next()
    response.headers.set(
        'Content-Security-Policy',
        "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src * data: blob:; frame-ancestors *; base-uri *; form-action *; object-src 'none';"
    )
    return response
}
 
export const config = {
  matcher: [
    '/:path*',
  ],
}