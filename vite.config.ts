import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // When VITE_API_URL is empty, the app calls /api/... (same origin). In dev, proxy that to Laravel.
  const devApiProxy = (env.DEV_API_PROXY || "http://127.0.0.1:8000").replace(/\/$/, "");
  const publicPath = (env.VITE_PUBLIC_PATH || "").replace(/\/$/, "");
  const base = publicPath ? `${publicPath}/` : "/";
  const apiProxyPrefix = publicPath ? `${publicPath}/api` : "/api";

  // When proxying to a remote host whose Laravel lives under a subpath (e.g. /backend/public),
  // prepend this to /api/... so requests hit the real API (otherwise /api/* 404s on the server).
  const devApiPathPrefix = (env.DEV_API_PATH_PREFIX || "").replace(/\/$/, "");

  const apiProxy: Record<string, unknown> = {
    target: devApiProxy,
    changeOrigin: true,
    secure: true,
  };

  if (publicPath) {
    apiProxy.rewrite = (path: string) =>
      path.replace(new RegExp(`^${publicPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "");
  } else if (devApiPathPrefix) {
    apiProxy.rewrite = (path: string) => `${devApiPathPrefix}${path}`;
  }

  return {
    base,
    server: {
      host: "127.0.0.1",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        [apiProxyPrefix]: apiProxy,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
