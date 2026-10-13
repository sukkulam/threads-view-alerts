# Threads View Alerts: instructions for coding agents

This repository contains a standalone Cloudflare Workers + D1 web app that reads
public Threads view counts and sends Telegram alerts. It does not use a GPT,
OpenAI, or Meta API. Read README.md and AI-INSTALL.md for installation requests.

## When the user asks to install it

- Determine whether the current environment can clone/download files, run Node
  commands, and complete the user's Cloudflare login. Perform available setup
  and checks; clearly identify any steps the user must perform themselves.
- Install into the requesting user's own Cloudflare account with a new D1
  database, their own Access organization/application, and their own bot.
  Establish the intended account from `wrangler whoami` and the user's selection.
  Never guess an account ID, DB ID, team domain, AUD, or deployment URL.
- Use the README's deployment helpers and explicit `wrangler.json` config.
  `scripts/configure.mjs --input` supports a noninteractive JSON file containing
  only deployment metadata. Store it in ignored `.setup/`, never in source.
- Login, OTP entry, new accounts/terms, and private credential entry are done
  according to the host's permission rules. Guide the user through required
  interactive steps and continue independent preparation while waiting.
- Do not ask for passwords or bot tokens in chat. Use the deployed app's private
  settings form for bot tokens. Never print, commit, upload, or publish secrets.
- Existing deployments retain their DB and original TOKEN_ENCRYPTION_KEY.
  `secret:init` refuses to replace an existing server key without its backup.
  Do not delete databases, change server audience, rotate keys, remove webhooks,
  disable login, or buy/upgrade a plan unless the user separately requests it.
- The local preview identity works only on loopback HTTP. Never deploy the local
  config or enable LOCAL_DEV in an internet-facing installation.
- Complete the verification in AI-INSTALL.md. Report actual deployment, email
  login, public view retrieval, and Telegram receipt separately. Do not report
  installation or notification success merely because a command was attempted.

## Changes and distribution

- Preserve per-user ownership checks, signed Access JWT verification, encrypted
  bot storage, exact public counts, duplicate-alert records, and prior counts on
  collection failure.
- Run `npm test` after changing code. Use local preview or deploy --dry-run for
  relevant Worker changes; do not test against a user's production data.
- After changing README.md, run `node scripts/build-guide.mjs`.
- Use `node scripts/package.mjs` for a shareable ZIP. Personal wrangler.json,
  .setup/, .env*, .dev.vars*, .wrangler/, work/, and node_modules/ stay private.
- GitHub publication is separate from installing a user's Cloudflare server.
  Only publish changes when the user requests it; never copy another project's
  Git history or private configuration into this standalone repository.
