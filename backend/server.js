require('dotenv').config();
const http = require('http');
const net = require('net');
const app = require('./src/app');
const prisma = require('./src/lib/prisma');
const { initSocket } = require('./src/lib/socket');
const whatsappService = require('./src/services/whatsapp.service');

const preferredPort = Number(process.env.PORT || 4001);

const server = http.createServer(app);

const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, '0.0.0.0');
  });
};

const findAvailablePort = async (startPort, maxAttempts = 20) => {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found starting from ${startPort}`);
};

// Initialize Socket.io with the http server
initSocket(server);

const startServer = async () => {
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.warn(`⚠️  Port ${preferredPort} is already in use. Starting on ${port} instead.`);
  }

  server.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Initialize WhatsApp Web Client
whatsappService.initialize();

// ─── Graceful Shutdown ──────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n⏳ ${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    await whatsappService.shutdown();
    await prisma.$disconnect();
    console.log('✅ Server closed. Database disconnected.');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});
