variable "hcloud_token" {
  description = "Hetzner Cloud API token (Read & Write)"
  type        = string
  sensitive   = true
}

variable "ssh_public_key_path" {
  description = "Path to your SSH public key file (~/.ssh/id_ed25519.pub)"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "server_type" {
  description = "Hetzner server type. cx23 = 2 Intel vCPU/4GB (~€4), cpx22 = 2 AMD vCPU/4GB (~€8)"
  type        = string
  default     = "cx23"
}

variable "location" {
  description = "Hetzner datacenter: nbg1 (Nuremberg), fsn1 (Falkenstein), hel1 (Helsinki), ash (Ashburn), hil (Hillsboro)"
  type        = string
  default     = "nbg1"
}

variable "enable_backups" {
  description = "Enable Hetzner's automated server backups (adds ~20% to server cost)"
  type        = bool
  default     = false
}

# ── Cloudflare DNS ─────────────────────────────────────────────

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:Read and DNS:Edit permissions"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_records" {
  description = "Map of DNS A records to create. Key is a unique identifier. 'name' is the record name ('@' for apex), 'domain' is the zone's root domain, 'zone_id' is the Cloudflare zone ID, 'proxied' optionally overrides cloudflare_proxied for this record."
  type = map(object({
    name    = string
    domain  = string
    zone_id = string
    proxied = optional(bool)
  }))
  default = {}
}

variable "cloudflare_proxied" {
  description = "Enable Cloudflare proxy (CDN + free SSL). true = orange cloud, false = grey cloud"
  type        = bool
  default     = true
}
