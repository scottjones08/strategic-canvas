#!/bin/bash
# Run this to create and push to GitHub

cd ~/Documents/GitHub/strategic-canvas

# Authenticate with GitHub (you'll need to do this once)
gh auth login

# Create the repo
gh repo create strategic-canvas --public --description "AI-powered business planning whiteboard"

# Add remote and push
git remote add origin https://github.com/scottjonesdev/strategic-canvas.git 2>/dev/null || true
git branch -M main
git push -u origin main
