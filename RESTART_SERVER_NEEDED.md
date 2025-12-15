# ⚠️ Server Restart Needed

## What Happened:

I've added new categories to the Blog model:
- Recovery Guide
- Community Education  
- Support Tool

But the database enum needs to be updated.

## 🔧 How to Fix:

### Step 1: Stop Your Server
Press `Ctrl+C` in the server terminal

### Step 2: Restart the Server
```bash
cd server
npm start
```

The server will automatically sync the database and add the new enum values.

### Step 3: Create Sample Resources
After the server starts successfully, run:
```bash
node create-sample-resources.js
```

This will create 9 sample resources (3 for each category).

---

## 📋 What Will Be Created:

### Recovery Guides (3):
1. Understanding Addiction: A Comprehensive Recovery Guide
2. Harm Reduction Strategies: A Practical Guide
3. Family Support Guide: Supporting a Loved One in Recovery

### Community Education (3):
1. Breaking the Stigma: Mental Health Awareness Workshop
2. Mental Health First Aid: Community Training Guide
3. Addiction Education: Facts vs. Myths

### Support Tools (3):
1. Daily Mood Tracker & Wellness Journal
2. Coping Strategies Toolkit: Managing Stress & Anxiety
3. Crisis Support Directory: Kenya Mental Health Resources

---

## ✅ After Creating Resources:

The marketing page buttons will work like this:
- **"Blog & Articles"** button → Shows blog posts
- **"Recovery Guides"** button → Shows recovery guides
- **"Community Education"** button → Shows education materials
- **"Support Tools"** button → Shows support tools

All using the same `/blog` page with category filtering!

---

**Please restart your server now, then run the create-sample-resources script!**
