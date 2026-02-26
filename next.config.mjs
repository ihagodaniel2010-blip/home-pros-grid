/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Port configuration handled via CLI or environment
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ozhjvprhhsdglxokfwze.supabase.co',
            },
        ],
    },
};

export default nextConfig;
