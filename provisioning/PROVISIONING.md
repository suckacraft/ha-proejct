# Provisioning Checklist -- New Client Site

Use this checklist for every new client installation.
Complete it in order. Do not skip steps.
Sign off each section before proceeding to the next.

---

## Pre-install (office, before site visit)

- [ ] Client agreement signed and on file
- [ ] Retainer tier agreed and invoiced
- [ ] Site survey completed (room count, device list, cable runs required)
- [ ] Hardware ordered and received
- [ ] Hardware tested on bench before delivery
- [ ] Mini PC imaged with base OS and Docker
- [ ] HA installed and confirmed booting on mini PC
- [ ] Provisioning script ready: provisioning/provision-site.js
- [ ] Client config prepared: provisioning/site-template/site.config.json
- [ ] Backblaze B2 buckets created for this site (config + camera clips)
- [ ] SOPS secrets file generated and encrypted
- [ ] Cloudflare Tunnel created and tested
- [ ] Client PWA URL confirmed and resolving

---

## On-site -- electrician tasks

- [ ] Comms cabinet installed or nominated
- [ ] Mini PC mounted and powered in cabinet
- [ ] PoE switch installed and powered
- [ ] Cat6 runs completed to all camera positions
- [ ] Cameras mounted and connected to PoE switch
- [ ] Shelly relays installed behind switch plates (one per circuit)
- [ ] All electrical work certified

---

## On-site -- platform tasks

- [ ] Mini PC connected to client network
- [ ] Tailscale enrolled on mini PC (operator tailnet)
- [ ] HA accessible at http://[site-ip]:8123
- [ ] All Shelly relays discovered in HA
- [ ] Zigbee dongle inserted and Zigbee2MQTT running
- [ ] All Zigbee devices paired and named
- [ ] All sensors placed and confirmed reporting
- [ ] Cameras appearing in Frigate
- [ ] Person detection tested on each camera
- [ ] Coral TPU confirmed active in Frigate logs
- [ ] Sensibo paired with climate system
- [ ] All entities assigned to rooms in client.config.json
- [ ] All automations loaded and tested
- [ ] All scenes tested (Morning, Away, Evening, Movie, Sleep)
- [ ] Provisioning script run and completed cleanly
- [ ] Remote access confirmed from operator laptop via Tailscale
- [ ] Client PWA accessible from outside network via Cloudflare Tunnel
- [ ] First automated backup confirmed in Backblaze B2
- [ ] ha-core restarted after any config changes during commissioning -- a stale
  server causes silent SSE failures (tiles load but never update live)
- [ ] Playwright smoke test run from operator laptop after provisioning: navigate
  to the client app URL, toggle a light in HA, confirm the tile updates within
  2 seconds without a refresh
- [ ] Preferences API seeded with the client's home screen favourites
  (POST /api/preferences/home_favourites)

---

## Handover

- [ ] Client app installed on all household phones (see CLIENT_HANDOVER.md)
- [ ] Client walkthrough completed (see CLIENT_HANDOVER.md)
- [ ] Push notifications tested on client's phone
- [ ] Client quick reference sheet left with client
- [ ] Client login credentials delivered securely
- [ ] CLIENT_PRIVACY.md reviewed with client
- [ ] MANAGED_SERVICE.md reviewed with client
- [ ] Site registered in operator-app sites.json
- [ ] Site added to operator dashboard and confirmed showing healthy

---

## Post-install (office, within 24 hours)

- [ ] Commissioning checklist filed
- [ ] Site config committed to git
- [ ] Client invoiced for installation
- [ ] Retainer payment set up
- [ ] 7-day follow-up call scheduled
- [ ] Any punch list items logged as issues
- [ ] All device types at this site have appropriate custom tiles (not just
  FallbackTile). Log any new device types as tile requests for the next
  development sprint.
- [ ] CLIENT_HANDOVER.md PWA installation completed on all household iOS devices
  -- push notifications confirmed.

---

## Sign-off

Installer: _______________  Date: _______________

Electrician: _______________  Date: _______________

Client acknowledged: _______________  Date: _______________
