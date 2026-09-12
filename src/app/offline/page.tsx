import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline | Bushbuyer",
  description: "You appear to be offline. Please check your internet connection.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a3a2a" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f1f18;
            color: #e2f0e8;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
          }
          .container {
            max-width: 440px;
            width: 100%;
          }
          .icon-wrap {
            width: 100px;
            height: 100px;
            margin: 0 auto 1.75rem;
            background: rgba(34, 197, 94, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(34, 197, 94, 0.25);
          }
          .icon-wrap svg {
            width: 48px;
            height: 48px;
            color: #4ade80;
          }
          h1 {
            font-size: 1.75rem;
            font-weight: 800;
            color: #f0faf4;
            margin-bottom: 0.75rem;
          }
          p {
            font-size: 1rem;
            color: #9ab8a4;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 2rem;
            border-radius: 9999px;
            background: #22c55e;
            color: #0f1f18;
            font-size: 0.95rem;
            font-weight: 700;
            text-decoration: none;
            transition: background 0.2s, transform 0.15s;
          }
          .btn:hover { background: #16a34a; transform: translateY(-1px); }
          .divider {
            margin: 1.5rem auto;
            width: 40px;
            height: 2px;
            background: rgba(255,255,255,0.08);
            border-radius: 9999px;
          }
          .cached-note {
            font-size: 0.8rem;
            color: #6b8f7a;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1>You&apos;re Offline</h1>
          <p>
            It looks like you&apos;ve lost your internet connection. 
            Please check your network and try again.
          </p>
          <a href="/" className="btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Try Again
          </a>
          <div className="divider" />
          <p className="cached-note">
            Some pages you&apos;ve visited before may still be accessible from cache.
          </p>
        </div>
      </body>
    </html>
  );
}
