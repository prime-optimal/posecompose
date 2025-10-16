# Deployment Troubleshooting Guide

This guide helps you troubleshoot and fix issues with tuned prompts not being utilized in your Netlify deployment.

## 🚨 Common Issue: Tuned Prompts Not Working

If your deployed application is using fallback prompts instead of your tuned database prompts, follow these steps:

## 🔧 Step-by-Step Fixes

### 1. Verify Netlify Configuration

Your `netlify.toml` should include these redirects:

```toml
[[redirects]]
    from = "/api/*"
    to = "/.netlify/functions/api/:splat"
    status = 200

[[redirects]]
    from = "/.netlify/functions/api"
    to = "/.netlify/functions/api/"
    status = 200
```

### 2. Check Environment Variables

In your Netlify site settings, ensure these environment variables are set:

- `NEON_DATABASE_URL` - Your Neon database connection string
- `NEON_DATABASE_URL_READONLY` - (Optional) Read-only connection string
- `API_ALLOW_ORIGIN` - Set to your site domain (e.g., `https://your-site.netlify.app`)

### 3. Verify Database Schema

Run the schema verification script:

```bash
# Set your production database URL
export NEON_DATABASE_URL="your-production-db-url"

# Run verification
bun run db:verify
```

Expected output should show:
- ✅ `costume_ai_generation_enhanced` table exists
- ✅ `costume_ai_references` table exists  
- ✅ `ai_settings` column exists in costumes table
- ✅ Records present in enhanced tables

### 4. Test API Endpoints

After deployment, test your API endpoints:

```bash
# Set your deployed site URL
export VITE_API_BASE_URL="https://your-site.netlify.app"

# Run integration tests
bun run test:deployment
```

This will test:
- `/api/health` - Basic connectivity
- `/api/costumes` - Costume data with AI settings
- `/api/costumes/featured` - Featured costumes
- `/api/logs` - Logging functionality

## 🐛 Common Problems and Solutions

### Problem: API Returns 404 Errors

**Cause**: Missing Netlify redirects or function not deployed properly.

**Solution**:
1. Verify `netlify.toml` has the redirects section
2. Check Netlify Functions tab in dashboard to ensure function is deployed
3. Redeploy your site

### Problem: No AI Settings in API Response

**Cause**: Database connection issues or missing schema.

**Solution**:
1. Verify `NEON_DATABASE_URL` is correctly set in Netlify environment
2. Run `bun run db:verify` to check schema
3. Apply enhanced schema migration if needed

### Problem: Logging Not Working

**Cause**: CORS issues or logging endpoint not accessible.

**Solution**:
1. Check browser console for CORS errors
2. Verify `API_ALLOW_ORIGIN` includes your site domain
3. Test logging endpoint directly with curl

### Problem: Fallback Prompts Being Used

**Cause**: AI settings not loading or database queries failing.

**Solution**:
1. Check Netlify function logs for database errors
2. Verify enhanced tables have data
3. Check that `seed-ai-settings.ts` has been run against production

## 🔄 Deployments Steps

### 1. Pre-deployment Checks

```bash
# Verify local setup
bun run dev:check

# Check database schema (if needed)
bun run db:verify
```

### 2. Deploy to Netlify

```bash
# Build and deploy
bun run build
netlify deploy --prod
```

### 3. Post-deployment Verification

```bash
# Test the deployed site
export VITE_API_BASE_URL="https://your-site.netlify.app"
bun run test:deployment
```

## 📊 Monitoring and Debugging

### Check Prompt Usage

With the new logging system, you can monitor which prompts are being used:

1. Open your deployed site
2. Try AI generation with a costume
3. Check browser console for log events
4. Verify `ai_prompt_selected` events show `source: "aiSettings"` or `source: "aiGeneration"`

### View Netlify Function Logs

1. Go to your Netlify site dashboard
2. Navigate to Functions tab
3. Click on your function to view logs
4. Look for database connection errors or query failures

### Browser Console Debugging

Open browser console and look for:
- `[PoseCompose]` log entries
- Network requests to `/api/*` endpoints
- CORS errors or failed requests

## 🆘 Emergency Fixes

If your deployment is completely broken:

### Quick Rollback

1. Go to Netlify Deploy tab
2. Find the last working deployment
3. Click "Publish deploy" on that version

### Minimal Working Configuration

If you need a quick fix, ensure you have:

1. Basic `ai_settings` column in costumes table
2. Legacy neon-client working
3. Environment variables set correctly

## 📝 Checklist Before Deployment

- [ ] `netlify.toml` has API redirects
- [ ] Environment variables set in Netlify
- [ ] Database schema verified with `bun run db:verify`
- [ ] Enhanced AI tables have data
- [ ] Local testing passes
- [ ] No TypeScript errors (`bunx tsc --noEmit`)
- [ ] Linting passes (`bun run lint`)

## 🎯 Success Indicators

Your deployment is working correctly when:

- ✅ `/api/costumes` returns costumes with `aiSettings` or `aiGeneration`
- ✅ `/api/logs` accepts POST requests
- ✅ Browser shows `ai_prompt_selected` events with correct source
- ✅ AI generation uses tuned prompts instead of fallbacks
- ✅ Reference ordering places user selfies first

## 📞 Support

If you're still having issues:

1. Check Netlify function logs for errors
2. Verify database connection with `bun run db:verify`
3. Run `bun run test:deployment` for comprehensive testing
4. Check browser console for client-side errors

Remember: The most common issue is missing Netlify redirects that prevent the frontend from reaching your API functions.