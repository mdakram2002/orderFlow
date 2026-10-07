const apiGatewayUrl = process.env.API_GATEWAY_URL ?? "http://localhost:30000";

module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiGatewayUrl}/api/:path*`,
      },
    ];
  },
};
