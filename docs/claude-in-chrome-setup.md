# Prompt for Claude in Chrome

I'm checking the EarlySignal app's Supabase and Vercel settings. Do these steps in my browser, in order, and tell me when each is done. Don't paste any secrets or keys back to me in chat; leave them in the forms.

## Part 1 — Supabase auth settings
Open https://supabase.com/dashboard/project/vpfwybfgiqiiimzayydj/auth/providers

1. Under Email: make sure "Enable Email provider" is ON and "Confirm email" is OFF (the app creates accounts with email + password and never sends mail). Save.
2. Under Google: turn it OFF if it is on. The app no longer offers Google sign-in.
3. Go to Authentication → URL Configuration. Site URL must be https://earlysignal-nvs.vercel.app and the only Redirect URL https://earlysignal-nvs.vercel.app/** . Remove any localhost entries. Save.
4. Go to Authentication → Attack Protection. Turn ON "Leaked password protection" if the toggle is available on this plan. Save.

## Part 2 — Google Cloud (clean-up only)
5. Open https://console.cloud.google.com/apis/credentials signed in as angelamarieteng@gmail.com.
6. If there is an OAuth client whose secret starts with GOCSPX-nzHz…, open it and click "Reset secret", or delete the client. That secret was exposed and is not used by the app.

## Part 3 — Vercel
7. Open https://vercel.com and the "earlysignal-nvs" project. Settings → Git: Production Branch must be "main".
8. Settings → Git → Ignored Build Step: set the command to `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` so only `main` builds (the `gh-pages` branch is the GitHub Pages demo and must not build on Vercel).
9. Settings → Environment Variables: confirm EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY exist for Production (they are also in `vercel.json`). These two values are public by design.
10. Deployments: open the latest Production deployment and tell me whether it is Ready, and the URL.

When all done, summarize which steps succeeded and anything that was greyed out or failed.
