
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  serverActions: true,
  devIndicators: {
    
  },
  allowedDevOrigins: [
      '**.' + process.env.GITPOD_WORKSPACE_ID + '.ws-eu114.gitpod.io',
      '**.' + process.env.GITPOD_WORKSPACE_ID + '.ws-us114.gitpod.io',
      '**.' + process.env.CS_HOSTNAME,
      '**.cloudworkstations.dev',
      '9003-firebase-studio-1759095904226.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev'
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
