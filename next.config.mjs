/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  // Correct turbopack.ignoreIssue syntax (path is REQUIRED and must be a string/glob or RegExp)
  turbopack: {
    ignoreIssue: [
      {
        // Suppress the React script tag warning (this is the main one you want gone)
        path: "**/*",
        title: /script tag while rendering React component/i,
        severity: "warning",
      },
    ],
  },

  reactStrictMode: true,

  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;