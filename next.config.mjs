/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // no anunciar la versión de Next.js al mundo
  compress: true,
  productionBrowserSourceMaps: false, // no exponer código fuente en producción
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
