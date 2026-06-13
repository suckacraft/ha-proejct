# Pi Network Recovery Guide

Use this guide when `00-discover-pi.ps1` times out and the Pi is not visible on
the network. Work through these options in order.

---

## Option 1: Ethernet Fallback (recommended first step)

The Pi may have a stale or wrong WiFi config from a previous session. Ethernet
bypasses all WiFi issues and gets you a shell immediately.

**Steps:**

1. Plug the Pi into the router with an ethernet cable (any LAN port).

2. Re-run discovery from the PC:
   ```
   .\setup\00-discover-pi.ps1
   ```
   The Pi will appear via ARP within one sweep even if it has no fixed IP.

3. SSH into the Pi using the detected IP:
   ```
   ssh pi@<pi-ip>
   ```

4. Check what WiFi networks the Pi can see:
   ```
   nmcli device wifi list
   ```

5. Connect to your WiFi network:
   ```
   sudo nmcli device wifi connect "<SSID>" password "<password>"
   ```
   Replace `<SSID>` and `<password>` with your actual network name and passphrase.

6. Confirm the connection is saved and will survive a reboot:
   ```
   nmcli connection show
   ```
   Your SSID should appear with a UUID and `DEVICE wlan0`.

7. Confirm the Pi got a DHCP lease on wlan0:
   ```
   ip addr show wlan0
   ```
   Look for an `inet` line like `inet 192.168.0.X/24`. If it shows `state DOWN`,
   bring it up:
   ```
   sudo nmcli device connect wlan0
   ```

8. Unplug the ethernet cable and reboot the Pi:
   ```
   sudo reboot
   ```

9. Wait 30-60 seconds, then re-run discovery:
   ```
   .\setup\00-discover-pi.ps1
   ```
   It should now find the Pi on WiFi.

---

## Option 2: Monitor and Keyboard (last resort)

Use this only if you have no way to SSH in even via ethernet (e.g. you do not
know the Pi's password and key auth is not yet set up).

1. Connect a monitor (micro-HDMI to HDMI) and USB keyboard to the Pi.

2. Power on. You should see the Pi OS login prompt.

3. Log in with username `pi` and the password you set in Pi Imager.

4. Run the same nmcli commands as Option 1, steps 4-9, directly at the console.

---

## Checking NetworkManager connection persistence

After connecting to WiFi, verify the connection will auto-reconnect:

```
nmcli connection show "<SSID>"
```

Key fields to look for:
- `connection.autoconnect: yes`  -- will reconnect on boot
- `802-11-wireless.ssid: <SSID>` -- correct network name
- `GENERAL.STATE: activated`     -- currently connected

If `autoconnect` is `no`, enable it:
```
sudo nmcli connection modify "<SSID>" connection.autoconnect yes
```

---

## Why the Pi might not be on WiFi

- **Wrong SSID or passphrase** stored from a previous session: the Pi connects
  to a network that no longer exists or uses a stale password.
- **2.4 GHz / 5 GHz mismatch**: Pi 5 supports both bands but may have stored a
  5 GHz SSID that your router is not broadcasting in that location.
- **mDNS not yet propagated**: the Pi is on WiFi but `piserver.local` takes a
  few seconds to register. Wait 30 seconds and re-run discovery.
- **Pi still booting**: the NetworkManager service starts after the desktop.
  Give it 60 seconds from power-on before assuming WiFi failed.

---

## Setting a static DHCP lease (do this once the Pi is reachable)

When `00-discover-pi.ps1` finds the Pi, it prints the MAC address. Log into your
router at `192.168.0.1` and bind that MAC to a fixed IP (e.g. `192.168.0.50`).

This ensures:
- `deploy-pi.ps1` and all scripts always use the same IP.
- SSH known_hosts never mismatches after a reboot.
- mDNS (`piserver.local`) resolves consistently.

After setting the static lease, reboot the Pi and confirm it gets the new IP:
```
ip addr show wlan0
```
