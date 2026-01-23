#!/bin/bash
# Push strategic-canvas to GitHub

set -e
cd "$(dirname "$0")"

echo "🔐 Authenticating with GitHub..."
gh auth login --web

echo "📦 Creating repository..."
gh repo create strategic-canvas --public --description "AI-powered business planning whiteboard with meeting companion"

echo "🚀 Pushing to GitHub..."
git remote add origin https://github.com/scottjonesdev/strategic-canvas.git 2>/dev/null || true
git branch -M main
git push -u origin main

echo "✅ Done! Repo: https://github.com/scottjonesdev/strategic-canvas"
