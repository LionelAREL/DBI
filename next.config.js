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
};

module.exports = nextConfig;
