
/** @type {import('next').NextConfig} */
const isGH = process.env.GITHUB_ACTIONS === 'true';
// Change this to your repo name (must match the GitHub repo exactly)
const repo = 'rotor-app';

const nextConfig = {
  // Export static HTML for GitHub Pages/Azure Static Web Apps
  output: 'export',

  // GitHub Pages needs these so assets resolve under /<repo>/
  basePath: isGH ? `/${repo}` : undefined,
  assetPrefix: isGH ? `/${repo}/` : undefined,

  // Disable image optimization during export
  images: { unoptimized: true },

  // Optional: if you see 404s for asset paths on Pages, uncomment:
  // trailingSlash: true,
};

export default nextConfig;
``
