import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Studio",
    template: "%s · Studio",
  },
  description: "Multi-site CMS and operations dashboard.",
  robots: { index: false, follow: false },
};

const NO_FLASH = `
try {
  var t = localStorage.getItem('studio:theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch (_) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
