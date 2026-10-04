import type { Metadata, Viewport } from "next";
import { RegistrarServiceWorker } from "@/components/layout/RegistrarServiceWorker";
import { ToastProvider } from "@/components/ui/Toast";
import { LOCALE, t } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: t.app.nome, template: `%s · ${t.app.nome}` },
  description: t.app.descricao,
  applicationName: t.app.nome,
  appleWebApp: { capable: true, title: t.app.nome, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={LOCALE}>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
