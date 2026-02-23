#!/bin/bash
# Cloudflare Pages Deployment Script
# This script deploys the application to Cloudflare Pages

set -e

echo "🚀 Starting Cloudflare Pages deployment..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build not found. Running build first..."
    npm run build
fi

echo "✅ Build ready. Deploying to Cloudflare Pages..."
echo ""
echo "📝 To deploy manually, run:"
echo "   npx wrangler pages deploy dist --project-name=visioncraft-ai"
echo ""
echo "💡 You'll need a Cloudflare API token with Pages permissions."
echo "   Create one at: https://dash.cloudflare.com/profile/api-tokens"
echo ""
echo "After deployment, your app will be live at:"
echo "   https://visioncraft-ai.pages.dev"
