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

locals {
  hostnames = [for r in var.cloudflare_records : r.name == "@" ? r.domain : "${r.name}.${r.domain}"]
}

# ── Cloudflare DNS Records ─────────────────────────────────────

resource "cloudflare_record" "all" {
  for_each = var.cloudflare_records

  zone_id = each.value.zone_id
  name    = each.value.name
  type    = "A"
  content = hcloud_server.app.ipv4_address
  ttl     = 1
  proxied = each.value.proxied != null ? each.value.proxied : var.cloudflare_proxied
}

# ── Cloudflare Origin CA Certificate ───────────────────────────

resource "tls_private_key" "stockcentral" {
  count = length(var.cloudflare_records) > 0 ? 1 : 0

  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "stockcentral" {
  count = length(var.cloudflare_records) > 0 ? 1 : 0

  private_key_pem = tls_private_key.stockcentral[0].private_key_pem

  subject {
    common_name = "stocks.tribalorigin.com"
  }
}

resource "cloudflare_origin_ca_certificate" "stockcentral" {
  count = length(var.cloudflare_records) > 0 ? 1 : 0

  csr                = tls_cert_request.stockcentral[0].cert_request_pem
  hostnames          = local.hostnames
  request_type       = "origin-rsa"
  requested_validity = 5475 # 15 years
}

# Write certificate files locally after creation
resource "local_file" "stockcentral_cert" {
  count = length(var.cloudflare_records) > 0 ? 1 : 0

  content         = cloudflare_origin_ca_certificate.stockcentral[0].certificate
  filename        = "${path.module}/ssl/cloudflare-origin.pem"
  file_permission = "0644"
}

resource "local_file" "stockcentral_key" {
  count = length(var.cloudflare_records) > 0 ? 1 : 0

  content         = tls_private_key.stockcentral[0].private_key_pem
  filename        = "${path.module}/ssl/cloudflare-origin.key"
  file_permission = "0600"
}
