# RepoWeekly browser extension

Shows a badge on a GitHub repository page when RepoWeekly has ranked it: stars gained that week and its place.

## Set up

1. In `background.js`, set `SITE` to your RepoWeekly address (the `SITE_URL` value, no trailing slash).
2. In `manifest.json`, change `host_permissions` to the same address, for example `https://user.github.io/*`.
3. Chrome or Edge: open `chrome://extensions`, switch on Developer mode, choose **Load unpacked** and pick this folder.

The extension reads `/api/repos.json` from your site, keeps it for six hours, and sends nothing to anyone.
