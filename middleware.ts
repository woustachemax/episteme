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
    response.headers.delete('Content-Security-Policy')
    response.headers.set(
        'Content-Security-Policy-Report-Only',
        "default-src *; script-src * 'unsafe-eval' 'unsafe-inline'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src *; frame-ancestors *; base-uri *; form-action *; object-src 'none';"
    )
    return response
}
 
export const config = {
  matcher: [
    '/:path*',
  ],
}