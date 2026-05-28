resource "hcloud_ssh_key" "deploy" {
  name       = "stock-central-deploy"
  public_key = file(var.ssh_public_key_path)
}

resource "hcloud_firewall" "web" {
  name = "stock-central-firewall"

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "SSH"
  }

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "HTTP"
  }

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "HTTPS"
  }
}

resource "hcloud_server" "app" {
  name         = "stock-central"
  server_type  = var.server_type
  image        = "ubuntu-24.04"
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.web.id]
  backups      = var.enable_backups

  labels = {
    app = "stock-central"
  }

  # Bootstrap Docker and create app directory
  user_data = <<-EOF
    #cloud-config
    package_update: true
    packages:
      - fail2ban
    runcmd:
      - curl -fsSL https://get.docker.com | sh
      - usermod -aG docker root
      - mkdir -p /opt/stock-central
      - systemctl enable --now docker
  EOF
}

# ── Cloudflare DNS Records ─────────────────────────────────────

resource "cloudflare_record" "stocks" {
  count = var.cloudflare_zone_id != "" ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = "stocks"
  type    = "A"
  content = hcloud_server.app.ipv4_address
  ttl     = 1
  proxied = var.cloudflare_proxied
}

resource "cloudflare_record" "stock_central" {
  count = var.cloudflare_zone_id != "" ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = "stock-central"
  type    = "A"
  content = hcloud_server.app.ipv4_address
  ttl     = 1
  proxied = var.cloudflare_proxied
}
