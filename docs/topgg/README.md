# Top.gg Listing

`long-description.html` is the replacement HTML fragment for Lunio's Top.gg long description.
It is not a website route or an application component. Use the HTML source in the description
editor, not the rendered page, and check Top.gg's preview before publishing.

## Why the Old Description Stretched

Inspection of the live listing on 2026-10-05 confirmed Top.gg's content container uses
`white-space: break-spaces`. Its child headings and containers inherit that value, so source
indentation and newlines become visible spacing. The replacement explicitly sets
`white-space: normal` at its root. Keep that declaration when editing or formatting it.

The design follows the new homepage, not the previous listing: centered "full music stack"
headline, subtle cyan hero glow, dashboard illustration, six feature cards, four setup steps,
and a final dashboard/support call to action. It uses the same dark surfaces, cyan primary
buttons, and restrained pink Premium accents. Cards and preview panels wrap on narrow screens.
The illustration uses the same example tracks as the homepage, is explicitly labeled as a
preview, and has no interactive controls or live metrics. The fragment avoids scripts, font
imports, animations, page positioning, unsupported latency promises, and hardcoded server counts.
Font stacks name the site's Manrope and Space Grotesk; fallback fonts are used when unavailable.
Inline heading/paragraph margins and line heights reduce interference from host typography.
Links retain native keyboard focus outlines; the description does not change Top.gg's page CSS.

The invite link matches the native Invite link observed on Lunio's public listing. If Top.gg
changes that route, use the listing's current native invite URL. This fragment does not copy
the old direct Discord invitation's Administrator permission request.

## Suggested Short Description

Lunio is the full music stack for your Discord server: live dashboard, saved playlists, custom request channels, and playback controls.

## Publishing

- Replace the current long-description HTML with the source of `long-description.html`.
- Check the editor preview at desktop and mobile widths, then save the listing.
- Verify the public page after saving, including links and text spacing.
- The local preview is not a guarantee of Top.gg's current sanitizer behavior; the live listing has not been changed by this task.
