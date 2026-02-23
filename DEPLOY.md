# Cloudflare Pages Deployment Guide

## Quick Deploy (Recommended)

### Option 1: Via Cloudflare Dashboard (Easiest)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Pages**
3. Click **Create project**
4. Select **Connect to Git**
5. Connect your GitHub repository
6. Configure build settings:
   - **Production branch**: `main` (or your branch)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
7. Click **Save and Deploy**

### Option 2: Via CLI (With API Token)

1. Get a Cloudflare API Token:
   - Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Create a token with **Edit** permissions for **Cloudflare Pages**

2. Deploy using:
```bash
export CLOUDFLARE_API_TOKEN=your_api_token_here
npx wrangler pages deploy dist --project-name=visioncraft-ai
```

## Configuration Files

- [`wrangler.toml`](wrangler.toml) - Pages configuration
- [`cloudflare.toml`](cloudflare.toml) - Additional Pages settings
- [`_headers`](public/_headers) - Security headers for all routes

## Environment Variables

Add these in your Pages project settings:
- `VITE_GEMINI_API_KEY` - Your Gemini API key for AI image generation

## Custom Domain (Optional)

1. In Pages settings, go to **Custom domains**
2. Click **Set up a custom domain**
3. Follow the DNS configuration instructions

## Your App Features

- User uploads an image
- User provides optional AI guidance prompt
- AI analyzes image with web search
- 5 creative suggestions are generated
- User selects a style to apply
- Image is regenerated using Gemini Pro Image

## Support

For issues, check:
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler Docs](https://developers.cloudflare.com/wrangler/)
