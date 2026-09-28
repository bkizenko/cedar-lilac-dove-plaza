import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Hearthwild";
const stylesheet =
  import.meta.env.DEV && !String(appCss).includes("direct")
    ? `${appCss}${String(appCss).includes("?") ? "&" : "?"}direct`
    : appCss;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
      },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "A band on open ground. Plant a hall on berries or timber, then found another where the stone sits.",
      },
      { name: "theme-color", content: "#1a1610" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: stylesheet },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{margin:0;height:100%;overflow:hidden;background:#1a1610;color:#e8dcc4}#game-root{position:relative;width:100%;height:100dvh;min-height:100vh;overflow:hidden}#game-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block}#boot{position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(ellipse at 70% 20%,#6a4a20 0%,#1a160e 55%,#0c0e0a 100%);color:#e8dcc4;font-family:Georgia,'Times New Roman',serif}",
          }}
        />
        <HeadContent />
      </head>
      <body className="bg-ink text-parchment antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
