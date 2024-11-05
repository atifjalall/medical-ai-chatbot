/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongodb']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'mongodb-client-encryption': 'mongodb-client-encryption',
        'kerberos': 'kerberos',
        'supports-color': 'supports-color',
        'aws4': 'aws4',
        'snappy': 'snappy',
        '@mongodb-js/zstd': '@mongodb-js/zstd',
        'mongodb': 'mongodb',
        'bson': 'bson',
      })
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**'
      }
    ]
  }
}

module.exports = nextConfig