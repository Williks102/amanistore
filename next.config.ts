
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  allowedDevOrigins: [
      ...(process.env.GITPOD_WORKSPACE_ID ? [
        '**.' + process.env.GITPOD_WORKSPACE_ID + '.ws-eu114.gitpod.io',
        '**.' + process.env.GITPOD_WORKSPACE_ID + '.ws-us114.gitpod.io',
      ] : []),
      ...(process.env.CS_HOSTNAME ? ['**.' + process.env.CS_HOSTNAME] : []),
      '**.cloudworkstations.dev',
      '9003-firebase-studio-1759095904226.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https'
        ,
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
