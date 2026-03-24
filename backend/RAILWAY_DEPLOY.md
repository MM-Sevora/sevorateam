# Sevora Hub - Railway Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Login" → Sign in with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your Sevora repository
4. Select the `backend` folder as root directory

### Step 3: Configure Environment Variables
In Railway dashboard, go to your service → Variables → Add these:

```
MONGO_URL=mongodb+srv://your-mongodb-connection-string
DB_NAME=sevora_team

JWT_SECRET=sevora-team-secret-2024
ACCESS_TOKEN_EXPIRE_MINUTES=10080

AZURE_CLIENT_ID=ec50e216-1abe-4c0f-af5c-1f4d50d51234
AZURE_TENANT_ID=bbe9ab04-36a1-4b03-833b-a798ddb2f232
AZURE_CLIENT_SECRET=your-azure-client-secret

WORKOS_API_KEY=your-workos-key
WORKOS_CLIENT_ID=your-workos-client-id

SENDGRID_API_KEY=your-sendgrid-key

OPENAI_API_KEY=your-openai-key
```

### Step 4: Deploy
1. Railway will auto-deploy when you push to GitHub
2. Or click "Deploy" manually in the dashboard

### Step 5: Get Your URL
1. Go to Settings → Domains
2. Click "Generate Domain" to get a URL like `sevora-api.up.railway.app`
3. Or add custom domain: `api.sevora.com`

### Step 6: Update Frontend
Update your frontend's environment variable:
```
REACT_APP_BACKEND_URL=https://your-railway-url.up.railway.app
```

Then redeploy the frontend on Emergent.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| MONGO_URL | Yes | MongoDB connection string |
| DB_NAME | Yes | Database name (sevora_team) |
| JWT_SECRET | Yes | Secret for JWT tokens |
| AZURE_CLIENT_ID | Yes | Azure AD app client ID |
| AZURE_TENANT_ID | Yes | Azure AD tenant ID |
| AZURE_CLIENT_SECRET | Yes | Azure AD client secret |
| WORKOS_API_KEY | No | WorkOS API key |
| SENDGRID_API_KEY | No | SendGrid for emails |
| OPENAI_API_KEY | No | OpenAI for AI features |

---

## Troubleshooting

### Build Fails
- Check `requirements.txt` has all dependencies
- Ensure Python version matches `runtime.txt`

### App Crashes
- Check logs in Railway dashboard
- Verify all required environment variables are set

### Database Connection Issues
- Ensure MongoDB Atlas allows Railway IPs (0.0.0.0/0 for all)
- Check MONGO_URL is correct

---

## Costs

- **Free Tier**: 500 hours/month (enough for ~20 days continuous)
- **Hobby Plan**: $5/month (recommended for production)
- **Pro Plan**: $20/month (for scaling)

---

## Support

Railway Docs: https://docs.railway.app
Railway Discord: https://discord.gg/railway
