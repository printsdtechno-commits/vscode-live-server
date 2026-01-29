This is the Adirai Rides Next.js application.

If you see this file when visiting the Vercel deployment, it means Vercel is deploying the root directory correctly, but Next.js is not building.

Expected routes:
- / (home/passenger app  
- /login (client login)
- /driver (driver dashboard)
- /driver/login (driver login)
- /admin (admin dashboard)

If you're seeing 404s, check these in Vercel Dashboard:
1. Project Settings → General → Root Directory (should be ./ or empty)
2. Project Settings → General → Framework Preset (should be "Next.js")
3. Deployments → Latest → Build Logs (check for errors)
4. Project Settings → Environment Variables (should be empty for this app)

Built with Next.js 16 + React 19
