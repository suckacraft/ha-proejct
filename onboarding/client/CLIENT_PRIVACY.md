# Privacy and Data -- What We Access and What We Don't

This document explains clearly what data the smart home system collects,
where it is stored, and what access we as the installer retain.

Share this with clients before or during installation.

---

## What stays in your home

Everything runs on hardware installed in your home. The following never
leaves your property except as noted below:

- All automation logic and rules
- All device states and history
- Continuous camera recordings (stored on your local hard drive)
- Voice commands and presence sensor data
- All device names, room layouts, and schedules

---

## What leaves your home (and why)

### Encrypted configuration backups

A nightly encrypted backup of your system configuration is sent to secure
cloud storage. This includes your automation rules, device settings, and
system state -- not camera footage. This is what allows us to restore your
system quickly if hardware fails.

Your footage is not included in these backups.

### Short camera event clips

When a person is detected by a camera, a short clip (typically 10-30
seconds) is stored in encrypted cloud storage for 90 days. This is what
powers the notifications you receive on your phone. These clips are
accessible only to you and to us for support purposes.

### Support access

We retain remote access to your system via an encrypted private network
connection (Tailscale). This allows us to diagnose issues and push updates
without a site visit. This connection is:

- Encrypted end to end
- Only accessible by authorised staff
- Used only for maintenance and support purposes
- Never used to view camera feeds without your explicit permission

---

## What we never do

- We never sell your data to third parties
- We never use your camera feeds for any purpose other than support
- We never store audio from your home
- We never share your personal information with device manufacturers
- We never access your system without a legitimate support reason

---

## Cancelling your managed service

If you cancel your managed service retainer:

- Your system continues to function independently
- We remove our remote access connection within 7 days
- Your local system and all local footage remain entirely yours
- Cloud backups and event clips are deleted within 30 days
- We will provide a configuration export so another provider can support you

---

## Questions

If you have any questions about your data or our access, contact us at:
[Business contact details]
