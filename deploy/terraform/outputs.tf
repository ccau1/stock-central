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
