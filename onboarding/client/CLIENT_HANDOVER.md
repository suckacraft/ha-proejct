# Client Handover Guide

This document is used by the installer during the client handover session.
Work through it with the client at the end of every installation.
Time required: 30-45 minutes.

---

## Before the handover session

Confirm these are complete before sitting down with the client:

- [ ] All devices paired and showing in HA
- [ ] All automations tested and confirmed firing
- [ ] All camera feeds live in Frigate
- [ ] Person detection tested on at least one camera
- [ ] Remote access confirmed from outside the home network
- [ ] Config backup confirmed in Backblaze B2
- [ ] Client PWA installed on client's phone (see iOS note below)
- [ ] Client PWA installed on all household members' phones
- [ ] HA update auto-update disabled
- [ ] Commissioning checklist signed off (see provisioning/PROVISIONING.md)

---

## Installing the PWA on the client's phone

### Android

1. Open Chrome on the client's phone
2. Navigate to the client app URL (from provisioning/site-template/site.config.json)
3. Tap the three-dot menu > Add to Home Screen
4. Confirm -- the app icon appears on the home screen

### iOS

IMPORTANT: iOS requires the PWA to be installed before push notifications work.
If the client skips this step, security alerts will not reach their phone.

1. Open Safari on the client's iPhone (must be Safari, not Chrome)
2. Navigate to the client app URL
3. Tap the Share button (box with arrow) > Add to Home Screen
4. Confirm -- the app icon appears on the home screen
5. Open the app from the home screen and accept notification permissions

---

## Client walkthrough script

### Introducing the system (5 minutes)

"This is your home's control centre. Everything in the house -- lights,
climate, cameras, and security -- is managed through this app. The system
runs entirely on hardware in your home. Nothing is stored in the cloud
except encrypted backups and short camera clips when motion is detected."

Show them: open the app, navigate to each room, show a device card.

### Scenes (5 minutes)

"These are your one-tap shortcuts. Morning sets everything up for the day.
Away secures the house when you leave. Evening is relaxed lighting. Movie
dims everything for watching. Sleep locks up and turns everything off."

Demonstrate: trigger each scene and show the house respond.

### Cameras (5 minutes)

"Your cameras use AI to detect people specifically -- not pets, not cars,
not leaves. You'll only get a notification when an actual person is
detected. The footage stays on your hardware here. We send a short clip
when something is detected, but continuous recording stays local."

Show them: open camera view, tap to fullscreen, show a recent event clip.

### Notifications (5 minutes)

"You'll get a notification like this when a person is detected on any
camera, when a door or window is opened while you're away, and if the
system goes offline for any reason."

Test: trigger a test detection and confirm notification arrives on their phone.

### Automations (5 minutes)

"The system handles most things automatically. Lights follow you through
the house. Climate pre-conditions before you arrive home. You don't need
to think about it."

Show them: walk through a room and show lights responding to presence.

### Support and managed service (5 minutes)

"As part of your monthly plan, we monitor your system remotely. If
something goes offline or a device stops responding, we'll usually know
before you do. Updates to the system are tested on our own home first
before being applied to yours."

Explain their specific retainer tier and what it includes.

---

## What to leave with the client

- [ ] Printed one-page quick reference (see provisioning/site-template/CLIENT_QUICK_REFERENCE.md)
- [ ] App URL and login credentials in a sealed envelope
- [ ] Your contact number for support
- [ ] Expected response time for their retainer tier

---

## iOS note for your records

iOS Web Push requires the PWA to be installed to the home screen via Safari.
If a client later says they are not getting notifications, this is almost
always the cause. Walk them through the installation again remotely via
a screen share or Tailscale.
