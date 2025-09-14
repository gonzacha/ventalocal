/**
 * Health Check Routes for ComercioYA API Gateway
 */

import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Basic health check endpoint
 * Used by Docker healthcheck and monitoring systems
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Basic service health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'ventalocal-api-gateway',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: 0
    };

    // Check database connection
    try {
      const { prisma } = await import('../config/database');
      await prisma.$queryRaw`SELECT 1`;
      health.status = 'healthy';
    } catch (error) {
      logger.error('Database health check failed:', error);
      health.status = 'unhealthy';
      return res.status(503).json({
        ...health,
        error: 'Database connection failed',
        responseTime: Date.now() - startTime
      });
    }

    // Check Redis connection
    try {
      const { redis } = await import('../config/redis');
      await redis.ping();
    } catch (error) {
      logger.warn('Redis health check failed:', error);
      // Redis failure is not critical, mark as degraded
      health.status = 'degraded';
    }

    health.responseTime = Date.now() - startTime;

    res.status(health.status === 'healthy' ? 200 : 206).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ventalocal-api-gateway',
      error: 'Internal service error',
      responseTime: Date.now() - startTime
    });
  }
});

/**
 * Detailed health check with dependency status
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ventalocal-api-gateway',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      database: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 },
      minio: { status: 'unknown', responseTime: 0 },
      meilisearch: { status: 'unknown', responseTime: 0 }
    },
    responseTime: 0
  };

  // Check database
  try {
    const dbStart = Date.now();
    const { prisma } = await import('../config/database');
    await prisma.$queryRaw`SELECT 1`;
    health.dependencies.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    health.dependencies.database = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    health.status = 'unhealthy';
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const { redis } = await import('../config/redis');
    await redis.ping();
    health.dependencies.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart
    };
  } catch (error) {
    health.dependencies.redis = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    if (health.status === 'healthy') {
      health.status = 'degraded';
    }
  }

  // TODO: Add MinIO and MeiliSearch health checks when services are available

  health.responseTime = Date.now() - startTime;

  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 206 : 503;

  res.status(statusCode).json(health);
});

/**
 * Readiness probe for Kubernetes/Docker orchestration
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const { prisma } = await import('../config/database');
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Critical services not available'
    });
  }
});

/**
 * Liveness probe for Kubernetes/Docker orchestration
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;