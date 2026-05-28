output "server_ip" {
  description = "Public IPv4 address of the Hetzner server"
  value       = hcloud_server.app.ipv4_address
}

output "server_id" {
  description = "ID of the created server (for CLI reference)"
  value       = hcloud_server.app.id
}

output "domains" {
  description = "DNS records created in Cloudflare"
  value = var.cloudflare_zone_id != "" ? [
    "stocks.tribalorigin.com",
    "stock-central.tribalorigin.com",
  ] : []
}

output "stockcentral_origin_certificate" {
  description = "Cloudflare Origin CA certificate (PEM). Save to deploy/ssl/cloudflare-origin.pem"
  value       = var.cloudflare_zone_id != "" ? cloudflare_origin_ca_certificate.stockcentral[0].certificate : ""
  sensitive   = false
}

output "stockcentral_origin_private_key" {
  description = "Private key for the Origin CA certificate (PEM). Save to deploy/ssl/cloudflare-origin.key"
  value       = var.cloudflare_zone_id != "" ? tls_private_key.stockcentral[0].private_key_pem : ""
  sensitive   = true
}

output "next_steps" {
  description = "Post-apply instructions"
  value = <<-EOT

  ✅ Terraform applied successfully!

  ── 1. Extract SSL certificate ───────────────────────────────

     mkdir -p ../ssl
     terraform output -raw stockcentral_origin_certificate > ../ssl/cloudflare-origin.pem
     terraform output -raw stockcentral_origin_private_key > ../ssl/cloudflare-origin.key
     chmod 600 ../ssl/cloudflare-origin.key

  ── 2. Upload certificate to server ──────────────────────────

     scp ../ssl/cloudflare-origin.pem ../ssl/cloudflare-origin.key root@${hcloud_server.app.ipv4_address}:/opt/stock-central/ssl/
     ssh root@${hcloud_server.app.ipv4_address} 'chmod 600 /opt/stock-central/ssl/cloudflare-origin.key'

  ── 3. Set Cloudflare SSL/TLS mode ───────────────────────────

     Go to: https://dash.cloudflare.com → tribalorigin.com → SSL/TLS → Overview
     Set to: "Full (strict)"

  ── 4. Add GitHub Secrets ────────────────────────────────────

     HETZNER_HOST = ${hcloud_server.app.ipv4_address}
     HETZNER_USER = root
     HETZNER_SSH_KEY = <your private SSH key>
     ENV_FILE = <copy from deploy/.env.example>
     GH_TOKEN = <GitHub classic PAT with read:packages>

  ── 5. Deploy ────────────────────────────────────────────────

     git push origin main

  EOT
}
