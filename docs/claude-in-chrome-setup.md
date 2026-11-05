# Prompt for Claude in Chrome

I'm setting up the EarlySignal app's Supabase and Vercel projects. Do these steps in my browser, in order, and tell me when each is done. Don't paste any secrets or keys back to me in chat; leave them in the forms.

## Part 1 — Supabase auth settings
Open https://supabase.com/dashboard/project/vpfwybfgiqiiimzayydj/auth/providers

1. Under Email: make sure "Enable Email provider" is ON, turn "Confirm email" OFF, and "Secure email change" ON. Save.
2. Go to Authentication → Email Templates → "Magic Link". Replace the body with:
   <h2>Your EarlySignal sign-in code</h2><p>Enter this code in the app: <strong>{{ .Token }}</strong></p><p>It expires in 10 minutes. If you didn't request it, ignore this email.</p>
   Save.
3. Go to Authentication → URL Configuration. Set Site URL to https://earlysignal-nvs.vercel.app and add these Redirect URLs: https://earlysignal-nvs.vercel.app/** and http://localhost:8081/** . Save.
4. Go to Authentication → Attack Protection (or Security). Turn ON "Leaked password protection". Save.

## Part 2 — Google sign-in
5. Open https://console.cloud.google.com/apis/credentials and sign in as angelamarieteng@gmail.com.
6. If there's an existing OAuth client whose secret starts with GOCSPX-nzHz…, open it and click "Reset secret" (it was exposed). Otherwise create a new OAuth client ID: type "Web application", name "EarlySignal".
7. Under Authorized JavaScript origins add https://earlysignal-nvs.vercel.app . Under Authorized redirect URIs add https://vpfwybfgiqiiimzayydj.supabase.co/auth/v1/callback . Save and keep the Client ID and Client secret visible.
8. Back in Supabase, Authentication → Providers → Google: turn it ON, paste the Client ID and Client secret into the fields, Save. Do not read the secret back to me.
9. In the Google console, open "OAuth consent screen" and make sure the app is published (not "Testing"), with app name "EarlySignal" and support email angelamarieteng@gmail.com.

## Part 3 — Vercel
10. Open https://vercel.com and open the "earlysignal-nvs" project. Go to Settings → General and check whether the project is in the team "angelamarieteng-gmailcom's projects". If it's under a personal account instead, use "Transfer Project" to move it to that team.
11. In Settings → Git, confirm the Production Branch is "main".
12. Go to Deployments and click "Redeploy" on the latest one (use the "Redeploy" button, with "Use existing build cache" unchecked). Wait for it to finish and tell me the deployment URL.

When all done, summarize which steps succeeded and anything that was greyed out or failed.
