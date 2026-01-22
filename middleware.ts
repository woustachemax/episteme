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
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    )
    return response
}
 
export const config = {
  matcher: [
    '/:path*',
  ],
}