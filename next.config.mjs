
/** @type {import('next').NextConfig} */
const isGH = process.env.GITHUB_ACTIONS === 'true';

// ⬇️ Change this to your exact repo name
const repo = 'rotor-app';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isGH ? `/${repo}` : undefined,
  assetPrefix: isGH ? `/${repo}/` : undefined,
  // If you get 404s on nested routes after export, uncomment:
  // trailingSlash: true,
};

export default nextConfig;
