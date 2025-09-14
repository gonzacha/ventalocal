# 🚀 ComercioYA Platform - Deployment Guide

Complete guide to deploy your ComercioYA multi-tenant e-commerce platform to production using Cloudflare Tunnel + Traefik architecture.

## 📋 Prerequisites

### Hardware Requirements
- **Minimum**: 4GB RAM, 2 CPU cores, 40GB storage
- **Recommended**: 8GB RAM, 4 CPU cores, 100GB storage
- **OS**: Ubuntu 22.04 LTS (preferred) or Ubuntu 20.04 LTS
- **Network**: Stable internet connection with static IP (optional if using Cloudflare Tunnel)

### Software Requirements
- Docker & Docker Compose
- Domain name registered and configured with Cloudflare
- Cloudflare account (free tier is sufficient)

## 🔧 Step 1: Server Preparation

### 1.1 Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip htop vim

# Create deployment directory
sudo mkdir -p /opt/ventalocal
sudo chown $USER:$USER /opt/ventalocal
cd /opt/ventalocal
```

### 1.2 Clone Repository
```bash
git clone https://github.com/yourusername/ventalocal-platform.git
cd ventalocal-platform
```

### 1.3 Run Security Hardening Script
```bash
chmod +x deploy/security-hardening.sh
./deploy/security-hardening.sh

# ⚠️ IMPORTANT: Reboot the server after hardening
sudo reboot
```

## 🌍 Step 2: Domain & Cloudflare Setup

### 2.1 Domain Configuration
1. Purchase a domain (e.g., `mitienda.com`)
2. Add domain to Cloudflare (free plan works)
3. Update nameservers at your registrar to Cloudflare's NS

### 2.2 Create Cloudflare Tunnel
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ventalocal-production

# Note down the tunnel ID and copy the credentials file
# The tunnel token will be needed for docker-compose
```

### 2.3 Configure DNS Records in Cloudflare
Add these CNAME records pointing to your tunnel:

| Type  | Name           | Content                    | Proxy |
|-------|----------------|----------------------------|-------|
| CNAME | store          | your-tunnel-id.cfargotunnel.com | ✅ |
| CNAME | api            | your-tunnel-id.cfargotunnel.com | ✅ |
| CNAME | admin          | your-tunnel-id.cfargotunnel.com | ✅ |
| CNAME | minio          | your-tunnel-id.cfargotunnel.com | ✅ |
| CNAME | minio-console  | your-tunnel-id.cfargotunnel.com | ✅ |
| CNAME | monitor        | your-tunnel-id.cfargotunnel.com | ✅ |
| CNAME | traefik        | your-tunnel-id.cfargotunnel.com | ✅ |

### 2.4 Configure Tunnel Routing
```bash
# Edit tunnel configuration
cloudflared tunnel route dns ventalocal-production api.yourdomain.com
cloudflared tunnel route dns ventalocal-production store.yourdomain.com
cloudflared tunnel route dns ventalocal-production admin.yourdomain.com
# ... add all subdomains
```

## 🔐 Step 3: Environment Configuration

### 3.1 Create Production Environment File
```bash
cp .env.production.template .env.production
vim .env.production
```

### 3.2 Fill in Required Variables
```env
# CRITICAL: Change these values!
DOMAIN=yourdomain.com
DB_PASSWORD=your_very_secure_db_password_here
JWT_SECRET=your_ultra_secure_jwt_secret_64_chars_minimum
MINIO_SECRET_KEY=your_secure_minio_key_20_chars
MEILISEARCH_MASTER_KEY=your_secure_meili_key

# Get this from Cloudflare Tunnel dashboard
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...your_tunnel_token

# Production Mercado Pago credentials
MP_ACCESS_TOKEN=APP_USR-your-production-access-token
MP_PUBLIC_KEY=APP_USR-your-production-public-key

# Generate Traefik basic auth
# htpasswd -nB admin
TRAEFIK_AUTH=admin:$2y$10$...your_hashed_password
```

### 3.3 Secure Environment File
```bash
chmod 600 .env.production
```

## 📊 Step 4: Database Setup

### 4.1 Initialize Database (First Time Only)
```bash
# Start only database first
docker-compose -f docker-compose.production.yml up -d postgres

# Wait for database to be ready
sleep 30

# Run migrations
docker-compose -f docker-compose.production.yml exec api-gateway npm run db:migrate

# Seed initial data (optional)
docker-compose -f docker-compose.production.yml exec api-gateway npm run db:seed
```

## 🚀 Step 5: Production Deployment

### 5.1 Build and Start All Services
```bash
# Build and start all containers
docker-compose -f docker-compose.production.yml up -d --build

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 5.2 Verify Deployment
```bash
# Check health endpoints
curl https://api.yourdomain.com/api/health
curl https://store.yourdomain.com

# Check internal networking
docker exec ventalocal-api curl -f http://postgres:5432 || echo "DB connection test"
docker exec ventalocal-api curl -f http://redis:6379 || echo "Redis connection test"
```

### 5.3 Monitor Container Status
```bash
# Real-time monitoring
watch docker-compose -f docker-compose.production.yml ps

# Resource usage
docker stats

# Log monitoring
docker-compose -f docker-compose.production.yml logs -f --tail=100 api-gateway
```

## 🛡️ Step 6: Security & Monitoring Setup

### 6.1 Configure Cloudflare Security
In Cloudflare dashboard:
- Enable **Bot Fight Mode**
- Set up **Rate Limiting** rules
- Configure **Firewall Rules** 
- Enable **DDoS Protection**
- Set **Security Level** to High

### 6.2 Set Up Uptime Monitoring
Access: `https://monitor.yourdomain.com`
- Default login: admin/admin (change immediately!)
- Add monitoring for all endpoints:
  - https://store.yourdomain.com
  - https://api.yourdomain.com/api/health
  - https://admin.yourdomain.com

### 6.3 Configure Backup Monitoring
Sign up at https://healthchecks.io and add your URL to `.env.production`:
```env
BACKUP_HEALTHCHECK_URL=https://hc-ping.com/your-unique-uuid
```

## 💾 Step 7: Backup Configuration

### 7.1 Configure Remote Backups (Recommended)
```bash
# Option A: Wasabi (S3-compatible, cheap)
BACKUP_S3_ENDPOINT=https://s3.us-east-1.wasabisys.com
BACKUP_S3_ACCESS_KEY=your_access_key
BACKUP_S3_SECRET_KEY=your_secret_key
BACKUP_S3_BUCKET=ventalocal-backups

# Option B: Backblaze B2
BACKUP_S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
# ... similar configuration
```

### 7.2 Test Backup Process
```bash
# Trigger manual backup
docker exec ventalocal-backup /scripts/backup-db.sh
docker exec ventalocal-backup /scripts/backup-files.sh

# Check backup files
ls -la backups/
```

## 📈 Step 8: Performance Optimization

### 8.1 Enable Cloudflare Optimizations
In Cloudflare dashboard:
- **Speed** → **Optimization** → Enable all
- **Caching** → Set custom rules for static assets
- **Compression** → Enable Brotli
- **HTTP/2** and **HTTP/3** → Enable

### 8.2 Database Optimization
```bash
# Connect to database
docker exec -it ventalocal-db psql -U ventalocal -d ventalocal

# Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_products_tenant_category ON products(tenant_id, category_id);
CREATE INDEX CONCURRENTLY idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_users_tenant_email ON users(tenant_id, email);
```

## 🔍 Step 9: Testing & Validation

### 9.1 End-to-End Testing Checklist
- [ ] **Store Frontend**: https://store.yourdomain.com
- [ ] **Product Catalog**: Browse categories and products
- [ ] **User Registration**: Create account
- [ ] **Add to Cart**: Test shopping cart functionality
- [ ] **Checkout Process**: Complete test purchase (sandbox mode)
- [ ] **Admin Panel**: https://admin.yourdomain.com
- [ ] **API Health**: https://api.yourdomain.com/api/health
- [ ] **File Uploads**: Test image upload functionality
- [ ] **Search**: Test product search
- [ ] **Mobile Responsive**: Test on mobile devices

### 9.2 Performance Testing
```bash
# Install load testing tools
npm install -g clinic loadtest

# Basic load test
loadtest -c 10 -t 60 https://api.yourdomain.com/api/health

# Stress test checkout process
loadtest -c 5 -t 30 https://store.yourdomain.com/api/products
```

### 9.3 Security Testing
```bash
# SSL/TLS check
echo | openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check security headers
curl -I https://store.yourdomain.com

# DNS propagation check
nslookup store.yourdomain.com 8.8.8.8
```

## 🎯 Step 10: Go Live!

### 10.1 Pre-Launch Checklist
- [ ] All services healthy and responsive
- [ ] SSL certificates valid
- [ ] Backups configured and tested
- [ ] Monitoring alerts set up
- [ ] Performance optimizations applied
- [ ] Security configurations verified
- [ ] Test transactions completed
- [ ] DNS fully propagated (24-48 hours)

### 10.2 Launch Day Tasks
1. **Switch Mercado Pago to Production**
   - Update MP tokens in `.env.production`
   - Configure webhooks in MP dashboard
   - Test real payment flow

2. **Configure Real SMTP**
   - Set up transactional email service
   - Test order confirmation emails

3. **Set Up Analytics**
   - Configure Google Analytics
   - Set up Google Tag Manager

### 10.3 Post-Launch Monitoring
```bash
# Monitor resource usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Check logs for errors
docker-compose -f docker-compose.production.yml logs -f | grep -i error

# Monitor database connections
docker exec ventalocal-db psql -U ventalocal -d ventalocal -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🆘 Troubleshooting

### Common Issues

**1. Containers Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs service-name

# Check resource usage
df -h
free -m
```

**2. Database Connection Errors**
```bash
# Check database status
docker exec ventalocal-db pg_isready -U ventalocal

# Reset database if needed
docker-compose -f docker-compose.production.yml restart postgres
```

**3. SSL/HTTPS Issues**
- Verify Cloudflare SSL mode is "Full (Strict)"
- Check DNS records are properly set
- Wait for DNS propagation (up to 48 hours)

**4. High Memory Usage**
```bash
# Restart services to free memory
docker-compose -f docker-compose.production.yml restart

# Clean up unused images
docker system prune -a
```

### Emergency Recovery

**Database Recovery**
```bash
# Restore from backup
gunzip -c backups/postgresql/ventalocal_YYYYMMDD.sql.gz | docker exec -i ventalocal-db psql -U ventalocal -d ventalocal
```

**Complete Service Restart**
```bash
# Emergency restart all services
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- **Daily**: Check monitoring alerts
- **Weekly**: Review backup success/failures
- **Monthly**: Update system packages and Docker images
- **Quarterly**: Review security configurations and logs

### Getting Help
- Check logs: `docker-compose -f docker-compose.production.yml logs`
- Monitor health: `https://api.yourdomain.com/api/health/detailed`
- Community support: [GitHub Issues](https://github.com/yourusername/ventalocal-platform/issues)

---

## 🎉 Congratulations!

Your ComercioYA Platform is now running in production! 🚀

**What's Next?**
- Monitor performance and optimize as needed
- Set up additional tenants for multiple stores
- Configure advanced analytics and reporting
- Implement advanced marketing features
- Scale horizontally as your business grows

**Key URLs:**
- **Store**: https://store.yourdomain.com
- **Admin**: https://admin.yourdomain.com  
- **API**: https://api.yourdomain.com
- **Monitor**: https://monitor.yourdomain.com

---

*Built with ❤️ by the ComercioYA team*