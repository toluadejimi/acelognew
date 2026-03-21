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

  return {
    base,
    server: {
      host: "127.0.0.1",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        [apiProxyPrefix]: {
          target: devApiProxy,
          changeOrigin: true,
          secure: true,
          rewrite: publicPath
            ? (path) => path.replace(new RegExp(`^${publicPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "")
            : undefined,
        },
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
