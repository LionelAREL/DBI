/** @type {import('next').NextConfig} */
const nextConfig = {
  // async redirects() {
  //   return [
  //     {
  //       source: "/:path+",
  //       destination: "/",
  //       permanent: false,
  //     },
  //   ];
  // },
  images: {
    domains: [
      "pink-bright-bonobo-930.mypinata.cloud",
      "upload.wikimedia.org",
      "i.ibb.co",
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
