# Setting Up Database Environment Variables in Vercel

You already have Supabase configured! Here's how to complete the setup:

## Step 1: Get Your Supabase Database Connection Info

1. Go to https://supabase.com/dashboard
2. Select your project (qnhuezgavmjdvayhydpe)
3. Click on **"Connect"** button (top right) or go to **Project Settings** (gear icon)
4. You'll see a "Connection String" section with different options

## Step 2: Find Your Connection Details

In Supabase, look for:
- **Connection pooler** (Recommended for serverless)
- **Direct connection**

The connection string will look like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

Your project reference is: `qnhuezgavmjdvayhydpe`

## Step 3: Add to Vercel Environment Variables

Go to: https://vercel.com/sytheos-ai-c1f1bdb4/probability-analyzer/settings/environment-variables

Add these variables for **Production**, **Preview**, and **Development**:

```
DATABASE_URL=[Your full Supabase connection string]
DB_HOST=aws-0-us-west-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.qnhuezgavmjdvayhydpe
DB_PASSWORD=[Your database password from Supabase]
```

## Alternative Method: Use Existing Supabase Client

Since you already have Supabase configured with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

We can modify the app to use Supabase's client instead of raw PostgreSQL. Would you like me to do that instead?

## To Find Your Password in Supabase:

1. In Supabase Dashboard, click the **"Connect"** button
2. Select **"ORMs"** or **"App Frameworks"**
3. You'll see the connection string with the password
4. Or click **"Reset database password"** if you need to create a new one

The key is finding the "Connect" or "Connection" section in your Supabase project dashboard.