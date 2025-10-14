# 🎭 Costume Management Workflow

This guide explains the complete workflow for managing costumes in your Waifu Material application, from adding new costumes to updating existing ones.

## 📁 Data Architecture

Understanding the data flow is crucial for effective costume management:

```
server/costumes.json (Source of Truth)
        ↓
scripts/seed-neon-costumes.ts (Seeding Script)
        ↓
Neon Database (Live Production Data)
        ↓
API Endpoint (/api/costumes)
        ↓
Frontend (Displays Live Data)
```

### 🗂️ Key Files and Their Roles

| File | Purpose | When to Edit |
|------|---------|--------------|
| `server/costumes.json` | **Source of truth** for costume data | ✅ Add/update costumes here |
| `scripts/seed-neon-costumes.ts` | Seeding script | ⚙️ Only if changing seeding logic |
| `src/data/costumes.tsx` | **Emergency fallback data only** | 🚫 Don't edit for production |
| `Neon Database` | Live production data | 🔄 Updated via seeding script |

## ➕ Adding New Costumes

### Step 1: Prepare Your Assets

Before adding a new costume, ensure you have:

1. **Images uploaded to Backblaze B2**:
   - Main reference image
   - Background/setting image
   - Detail shots (2-3 images)
   - Thumbnail image

2. **Image URLs ready**:
   ```
   https://f004.backblazeb2.com/file/waifu-test/costumes/your-costume-name/main.jpg
   https://f004.backblazeb2.com/file/waifu-test/costumes/your-costume-name/background.jpg
   https://f004.backblazeb2.com/file/waifu-test/costumes/your-costume-name/detail-1.jpg
   ```

### Step 2: Update the Source Data

Edit the source file that the seeding script reads from:

```bash
nano server/costumes.json
```

### Step 3: Add New Costume in Correct Format

Add a new entry to the `server/costumes.json` array:

```json
{
  "id": "your-new-costume",
  "display_name": "Your New Costume",
  "description": "Detailed description of the costume transformation experience",
  "reference_image_url": "https://f004.backblazeb2.com/file/waifu-test/costumes/your-new-costume/main.jpg",
  "thumbnail_url": "https://f004.backblazeb2.com/file/waifu-test/costumes/your-new-costume/thumb.jpg",
  "tags": ["halloween", "new", "category", "style"],
  "category": "halloween",
  "assets": [
    {
      "id": "main",
      "url": "assets/your-new-costume/main.jpg",
      "type": "main",
      "description": "Primary costume reference for AI transformation"
    },
    {
      "id": "background",
      "url": "assets/your-new-costume/background.jpg",
      "type": "background",
      "description": "Themed background setting for the costume"
    },
    {
      "id": "detail-1",
      "url": "assets/your-new-costume/detail-lace.jpg",
      "type": "detail",
      "description": "Close-up of intricate costume details"
    }
  ]
}
```

### Step 4: Seed to Neon

Run the seeding script to update the live database:

```bash
# From root directory
bun run scripts/seed-neon-costumes.ts

# Or with asset preservation (if updating existing costumes)
bun run scripts/seed-neon-costumes.ts --preserve-assets
```

### Step 5: Verify the Results

Check that your new costume appears in the API:

```bash
# Check all costumes
curl http://localhost:4000/api/costumes | jq '.[] | select(.id == "your-new-costume")'

# Check specific costume
curl http://localhost:4000/api/costumes/your-new-costume | jq '.'
```

## 🔄 Updating Existing Costumes

### Option A: Update Everything (Full Refresh)

Use this when changing images, assets, or major metadata:

```bash
# Edit server/costumes.json with your changes
# Then run full seed (updates all data including assets)
bun run scripts/seed-neon-costumes.ts
```

### Option B: Preserve Assets, Update Metadata Only

Use this when only changing text content, not images:

```bash
# Edit server/costumes.json with metadata changes
# Run with preserve-assets to keep existing image URLs
bun run scripts/seed-neon-costumes.ts --preserve-assets
```

## 🖼️ Image URL Best Practices

### Recommended URL Formats

```json
// ✅ Correct - Full B2 URL
"url": "https://f004.backblazeb2.com/file/waifu-test/costumes/costume-name/main.jpg"

// ✅ Also works - Relative path (script converts to full URL)
"url": "assets/costume-name/main.jpg"

// ❌ Avoid - Local paths (won't work in production)
"url": "/assets/costumes/costume-name/main.jpg"
```

### Image Organization

Organize your B2 bucket like this:

```
waifu-test/
├── costumes/
│   ├── gothic-lolita/
│   │   ├── main.jpg
│   │   ├── background.jpg
│   │   └── detail-lace.jpg
│   ├── cyberpunk-samurai/
│   │   ├── main.jpg
│   │   ├── background.jpg
│   │   └── detail-armor.jpg
│   └── your-new-costume/
│       ├── main.jpg
│       ├── background.jpg
│       └── detail-1.jpg
```

## ✅ Verification Steps

After any changes, always verify:

### 1. Check API Response
```bash
# Check API response format
curl http://localhost:4000/api/costumes | jq '.[0].name'

# Verify specific fields
curl http://localhost:4000/api/costumes | jq '.[0] | {name, assets, category}'
```

### 2. Test Frontend Integration
1. Open your app in the browser
2. Navigate to costume selection
3. Verify your new/updated costume appears
4. Check that images load correctly
5. Test costume selection functionality

### 3. Check Database (Optional)
```bash
# Run database test script
bun run test-db.js

# Check specific costume data
bun run test-db-fields.js your-costume-id
```

## 🛠️ Troubleshooting Costume Issues

### If costumes don't appear:

1. **Check Neon connection**:
   ```bash
   bun run test-db.js
   ```

2. **Verify seeding completed successfully**:
   - Look for "Completed Neon seed" message in seeding script output
   - Check for any error messages during seeding

3. **Check API logs for errors**:
   - Look at the terminal where your API server is running
   - Check for database connection errors

4. **Ensure environment variables are set**:
   ```bash
   echo $NEON_DATABASE_URL
   ```

### If images show as ghosts or broken:

1. **Verify B2 URLs are accessible**:
   ```bash
   curl -I "https://f004.backblazeb2.com/file/waifu-test/costumes/your-costume/main.jpg"
   ```

2. **Check asset URLs in database**:
   ```bash
   curl http://localhost:4000/api/costumes/your-costume | jq '.assets[0].url'
   ```

3. **Run seeding script again** to update asset URLs

### Common Error Messages:

| Error | Cause | Solution |
|-------|-------|----------|
| `name: null` and `assets: "null"` | Environment variables not loaded | Run API server from root directory |
| Legacy field names (`display_name`, `reference_image_url`) | Fallback to local JSON | Check `NEON_DATABASE_URL` and database connection |
| Empty costume list | Database connection failed or not seeded | Run seeding script and verify connection |
| Images not loading | Incorrect B2 URLs or permissions | Verify URLs are accessible and public |

## 📋 Best Practices

### For New Costumes:

1. **Upload images first** to Backblaze B2 before adding to JSON
2. **Use full B2 URLs** in `server/costumes.json` for reliability
3. **Test locally** with seeding script before deploying
4. **Verify in browser** before pushing to production
5. **Use descriptive IDs** that match the costume name

### For Updates:

1. **Use `--preserve-assets`** if only changing metadata (saves time)
2. **Full seed** if changing images/assets (ensures consistency)
3. **Always backup** your `server/costumes.json` before major changes
4. **Test one costume at a time** when doing bulk updates
5. **Document changes** in your changelog

### Workflow Summary:

```
1. Edit server/costumes.json
2. Run seeding script
3. Verify API response
4. Test in browser
5. Deploy to production
```

## 🚨 Important Reminders

- **Never edit `src/data/costumes.tsx` for production** - that's emergency fallback only
- **Always run API server from root directory** to load environment variables properly
- **Test thoroughly** before deploying to production
- **Keep backups** of your `server/costumes.json` file
- **Use consistent naming** for costume IDs and asset folders

## 🔄 Complete Workflow Example

Let's say you want to add a "Steampunk Inventor" costume:

```bash
# 1. Upload images to B2
# - main.jpg, background.jpg, detail-gears.jpg

# 2. Edit server/costumes.json
nano server/costumes.json

# 3. Add the costume entry
{
  "id": "steampunk-inventor",
  "display_name": "Steampunk Inventor",
  "description": "Victorian steampunk costume with goggles, gears, and brass accessories",
  "reference_image_url": "https://f004.backblazeb2.com/file/waifu-test/costumes/steampunk-inventor/main.jpg",
  "thumbnail_url": "https://f004.backblazeb2.com/file/waifu-test/costumes/steampunk-inventor/thumb.jpg",
  "tags": ["halloween", "steampunk", "victorian", "inventor"],
  "category": "halloween",
  "assets": [
    {
      "id": "main",
      "url": "assets/steampunk-inventor/main.jpg",
      "type": "main",
      "description": "Steampunk inventor costume with goggles and gears"
    }
  ]
}

# 4. Seed to database
bun run scripts/seed-neon-costumes.ts

# 5. Verify
curl http://localhost:4000/api/costumes/steampunk-inventor | jq '.'

# 6. Test in browser and deploy!
```

This workflow ensures your costume catalog stays synchronized between your source data, database, and live application.