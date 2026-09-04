/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ozhjvprhhsdglxokfwze.supabase.co',
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/experiences',
                destination: '/reviews/',
                permanent: true,
            },
            {
                source: '/experiences/',
                destination: '/reviews/',
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
