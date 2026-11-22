# Firefly Observatory — Web Edition

A dependency-free generative art observatory for Apache, PHP-FPM and modern browsers. Built for the Cybernetic Garden and Zeromoon visual experiments.

## Features

- Five independent particle-flow environments: Firefly Meadow, Nebula Drift, Aurora Current, Celestial Vortex and Abyssal Bioluminescence
- Five interpolated chromatic palettes
- Adjustable population (100–3,500), velocity, turbulence, afterglow and luminosity
- Pointer-driven gravitational influence
- Microphone and local audio-file reactivity using Web Audio API
- PNG frame capture and fullscreen mode
- Server-side preset persistence through a validated PHP JSON API
- Adaptive canvas pixel density, telemetry and keyboard shortcuts
- No frameworks, databases, CDNs, npm or Composer dependencies

## Requirements

- Apache httpd 2.4 with PHP 8.1+ through PHP-FPM
- Modern Firefox or Chromium browser
- Writable `data/` directory for saving presets
- HTTPS or localhost for microphone access

## Fedora Server 45 deployment

Install packages:

```bash
sudo dnf install httpd php php-fpm
sudo systemctl enable --now httpd php-fpm
```

Copy the project into a web-accessible directory:

```bash
sudo mkdir -p /var/www/html/firefly
sudo cp -a firefly-observatory-web/. /var/www/html/firefly/
sudo chown -R root:root /var/www/html/firefly
sudo chown apache:apache /var/www/html/firefly/data
sudo chmod 0750 /var/www/html/firefly/data
sudo restorecon -RFv /var/www/html/firefly
sudo semanage fcontext -a -t httpd_sys_rw_content_t '/var/www/html/firefly/data(/.*)?'
sudo restorecon -RFv /var/www/html/firefly/data
```

If `semanage` is unavailable, install `policycoreutils-python-utils`. Open `http://SERVER-IP/firefly/` from your browser. The HTTP service must be allowed through your chosen firewall zone; for example, after checking your active zone:

```bash
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

For remote access, prefer HTTPS. Microphone capture is blocked on ordinary insecure remote HTTP origins in modern browsers.

### PHP-FPM notes

The default Fedora PHP-FPM pool runs as `apache`. If you use a custom pool, assign ownership of `data/` to that pool user. The application does not require PHP extensions beyond the usual JSON support.

### Protect preset storage

The bundled `data/.htaccess` denies direct HTTP access when Apache permits `.htaccess` overrides. On Fedora's common default Apache configuration, `.htaccess` may be ignored. **Add this rule to the Apache virtual host or server configuration** to deny access regardless of overrides:

```apache
<Directory "/var/www/html/firefly/data">
    Require all denied
</Directory>
```

Then run `sudo apachectl configtest && sudo systemctl reload httpd`.

## Local development

```bash
cd firefly-observatory-web
php -S 127.0.0.1:8080
```

Visit `http://127.0.0.1:8080/`. The built-in PHP server does not enforce Apache `.htaccess` directives; do not expose this development server to untrusted networks.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Pause or resume |
| F | Enter or exit fullscreen |
| S | Export PNG snapshot |

## Application architecture

- `index.php`: HTML shell and security headers
- `api.php`: GET/POST preset API with strict validation and atomic writes
- `assets/style.css`: responsive observatory UI
- `assets/app.js`: animation, particle physics, rendering, interaction, audio analysis and exports
- `data/`: persisted preset JSON and access-denial files

The Canvas engine integrates a damped velocity field with mode-specific acceleration functions. Each particle has an independent oscillator, hue offset, size and field seed. Additive composition produces luminous overlap; a translucent background fill creates adjustable persistence trails. Audio analysis modulates particle motion and luminosity. The API accepts only known settings with bounded values.

## Performance

Start with 600–1,100 particles on older laptops. High particle counts, long afterglow and large device pixel ratios increase CPU/GPU load. Browser rendering runs locally; PHP does not calculate frames. The simulation caps large frame deltas to avoid jumps after inactive tabs.

## Security and operational notes

The preset endpoint is intended for a single-user trusted installation. It has no authentication or rate limiting. Do not expose the POST endpoint publicly without adding authentication, CSRF defenses, and request limits at the reverse proxy. Saved presets are not secret, but the storage directory should still be denied from web access. Local audio files remain in the browser; they are not uploaded to PHP. Microphone permission is requested only when the microphone button is used.

## License

GNU General Public License version 3 or later. See `LICENSE`.
