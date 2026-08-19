import {withAuth} from 'next-auth/middleware';

export default withAuth(
  function middleware() {},
  {
    pages: {signIn: '/sr/login'},
    callbacks: {
      authorized({token, req}) {
        const pathname = req.nextUrl.pathname;
        if (pathname === '/' || pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/invite/teacher') || pathname.includes('/privacy') || pathname.includes('/terms')) {
          return true;
        }
        return Boolean(token);
      }
    }
  }
);

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)']
};
