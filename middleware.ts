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
    
    return NextResponse.next()
}
 
export const config = {
  matcher: [
    '/:path*',
  ],
}