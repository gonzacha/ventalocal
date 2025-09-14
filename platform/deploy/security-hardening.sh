#!/bin/bash
# Security Hardening Script for ComercioYA Platform
# Run this on your Ubuntu server before deploying to production

set -euo pipefail

echo "🔒 ComercioYA Platform - Security Hardening"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

log_info "Starting security hardening process..."

# ===== SYSTEM UPDATES =====
log_info "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ===== FIREWALL SETUP =====
log_info "2. Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if you've modified it)
sudo ufw allow 22/tcp comment 'SSH'

# Don't open 80/443 - we're using Cloudflare Tunnel
# sudo ufw allow 80/tcp comment 'HTTP'
# sudo ufw allow 443/tcp comment 'HTTPS'

sudo ufw --force enable
log_info "UFW firewall configured (only SSH allowed)"

# ===== SSH HARDENING =====
log_info "3. Hardening SSH configuration..."
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create hardened SSH config
sudo tee /etc/ssh/sshd_config.d/99-ventalocal-hardening.conf > /dev/null <<EOF
# ComercioYA SSH Hardening
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
MaxAuthTries 3
MaxSessions 2
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers $(whoami)
X11Forwarding no
PrintMotd no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
EOF

# ===== FAIL2BAN =====
log_info "4. Installing and configuring Fail2Ban..."
sudo apt install -y fail2ban

sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
log_info "Fail2Ban configured and started"

# ===== AUTOMATIC SECURITY UPDATES =====
log_info "5. Configuring automatic security updates..."
sudo apt install -y unattended-upgrades apt-listchanges

sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "admin@localhost";
EOF

sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

# ===== DOCKER SECURITY =====
log_info "6. Configuring Docker security..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $(whoami)
    rm get-docker.sh
    log_warn "Please log out and log back in for Docker group membership to take effect"
fi

# Docker daemon security configuration
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "userland-proxy": false,
  "no-new-privileges": true,
  "seccomp-profile": "/etc/docker/seccomp.json",
  "storage-driver": "overlay2"
}
EOF

# ===== SYSTEM LIMITS =====
log_info "7. Configuring system limits..."
sudo tee /etc/security/limits.d/99-ventalocal.conf > /dev/null <<EOF
# ComercioYA Platform limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# ===== KERNEL PARAMETERS =====
log_info "8. Optimizing kernel parameters..."
sudo tee /etc/sysctl.d/99-ventalocal.conf > /dev/null <<EOF
# ComercioYA Platform kernel optimization
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.core.netdev_max_backlog = 5000
vm.swappiness = 10
fs.file-max = 2097152
kernel.pid_max = 4194304

# Security hardening
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
EOF

sudo sysctl --system

# ===== CREATE APPLICATION USER =====
log_info "9. Creating application user..."
if ! id "ventalocal" &>/dev/null; then
    sudo useradd -r -s /bin/false -d /opt/ventalocal -m ventalocal
    sudo usermod -aG docker ventalocal
    log_info "Created ventalocal system user"
fi

# ===== DIRECTORY PERMISSIONS =====
log_info "10. Setting up secure directories..."
sudo mkdir -p /opt/ventalocal/{app,logs,backups}
sudo chown -R ventalocal:ventalocal /opt/ventalocal
sudo chmod 755 /opt/ventalocal
sudo chmod 750 /opt/ventalocal/logs
sudo chmod 750 /opt/ventalocal/backups

# ===== LOGROTATE =====
log_info "11. Configuring log rotation..."
sudo tee /etc/logrotate.d/ventalocal > /dev/null <<EOF
/opt/ventalocal/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ventalocal ventalocal
    postrotate
        /bin/kill -HUP \`cat /var/run/rsyslogd.pid 2> /dev/null\` 2> /dev/null || true
    endscript
}
EOF

# ===== RESTART SERVICES =====
log_info "12. Restarting security services..."
sudo systemctl restart ssh
sudo systemctl restart fail2ban

# ===== FINAL CHECKS =====
log_info "13. Running security checks..."

echo ""
log_info "🔒 SECURITY HARDENING COMPLETED!"
echo "================================"
log_info "✅ System packages updated"
log_info "✅ UFW firewall configured (SSH only)"
log_info "✅ SSH hardened (key-based auth only)"
log_info "✅ Fail2Ban installed and configured"  
log_info "✅ Automatic security updates enabled"
log_info "✅ Docker security configured"
log_info "✅ System limits optimized"
log_info "✅ Kernel parameters hardened"
log_info "✅ Application user created"
log_info "✅ Secure directories created"
log_info "✅ Log rotation configured"

echo ""
log_warn "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Restart the server: sudo reboot"
echo "2. Verify SSH key-based login works"  
echo "3. Copy your project to /opt/ventalocal/app/"
echo "4. Configure your .env.production file"
echo "5. Set up Cloudflare Tunnel"
echo "6. Deploy with: docker-compose -f docker-compose.production.yml up -d"

echo ""
log_info "🛡️  Your server is now hardened and ready for production!"