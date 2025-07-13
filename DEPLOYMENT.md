# Deployment Guide

This guide explains how to deploy the Snap Lead Export application to various platforms including Netlify and Railway.

## Prerequisites

- A deployment platform account:
  - [Netlify](https://netlify.com) (recommended for static sites)
  - [Railway](https://railway.app) (for full-stack applications)
- A Supabase project with the necessary tables and storage buckets
- (Optional) N8N webhook endpoints for AI analysis

## Netlify Deployment (Recommended)

Netlify is the recommended platform for deploying this React application as it's optimized for static sites and SPAs.

### Environment Variables for Netlify

Set these in your Netlify dashboard under Site Settings → Environment Variables:

#### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Optional Variables (for AI features)

```bash
# N8N Webhook Configuration
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url_for_lead_processing
VITE_N8N_ANALYZE_URL=your_n8n_analyze_webhook_url

# App Configuration
VITE_APP_NAME=DELIFRU
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=false
```

### Netlify Deployment Steps

#### Option A: Deploy from Git (Recommended)

1. Fork this repository to your GitHub account
2. Go to [Netlify](https://netlify.com) and sign up/login
3. Click "New site from Git"
4. Connect your GitHub account and select the forked repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18 (set in netlify.toml)
6. Add environment variables in Site Settings → Environment Variables
7. Click "Deploy site"

#### Option B: Drag and Drop Deploy

1. Clone this repository locally
2. Install dependencies: `npm install`
3. Set environment variables in a `.env` file (for local build)
4. Build the project: `npm run build`
5. Go to [Netlify](https://netlify.com) and drag the `dist` folder to deploy

### Netlify Configuration

The project includes a `netlify.toml` file with:
- Automatic build configuration
- SPA redirect rules for client-side routing
- Security headers
- Asset caching optimization

### Custom Domain Setup (Netlify)

1. Go to Site Settings → Domain Management
2. Add your custom domain
3. Configure DNS records as instructed by Netlify
4. SSL certificate will be automatically provisioned

## Railway Deployment

Railway is suitable for applications requiring server-side features or more complex hosting needs.

## Environment Variables for Railway

The following environment variables must be set in Railway:

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
VITE_APP_NAME=Snap Lead Export
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=false
```

### Optional Variables (for AI features)

```bash
# N8N Webhook Configuration
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url_for_lead_processing
VITE_N8N_ANALYZE_URL=your_n8n_analyze_webhook_url
```

## Deployment Steps

### 1. Prepare Your Supabase Project

Ensure your Supabase project has the following:

#### Tables:
- `leads` table with columns: id, email, whatsapp, status, source, created_at, notes, image_url
- `drink_menu` table with columns: id, name, description, category
- `syrup_photos` table with columns: id, filename, original_name, file_path, public_url, file_size, content_type, created_at, updated_at, metadata, tags, description

#### Storage Buckets:
- `lead-images` bucket for storing customer photos
- `syrup-bottles` bucket for storing syrup bottle images

#### Row Level Security (RLS):
Make sure RLS policies are configured to allow:
- Anonymous users to insert into `leads` table
- Anonymous users to read from `drink_menu` table
- Anonymous users to insert into `syrup_photos` table

### 2. Deploy to Railway

#### Option A: Deploy from GitHub

1. Fork this repository to your GitHub account
2. Go to [Railway](https://railway.app) and create a new project
3. Connect your GitHub repository
4. Railway will automatically detect the Node.js project
5. Set the environment variables in Railway dashboard
6. Deploy!

#### Option B: Deploy with Railway CLI

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize the project:
   ```bash
   railway init
   ```

4. Set environment variables:
   ```bash
   railway variables set VITE_SUPABASE_URL=your_supabase_url
   railway variables set VITE_SUPABASE_ANON_KEY=your_supabase_key
   # Add other variables as needed
   ```

5. Deploy:
   ```bash
   railway up
   ```

### 3. Configure Domain (Optional)

1. Go to your Railway project dashboard
2. Click on "Settings" → "Domains"
3. Add a custom domain or use the Railway-provided domain
4. Update any necessary DNS records

### 4. HTTPS Configuration

Railway automatically provides HTTPS for all deployments. The application is configured to work without local SSL certificates in production.

## Build Configuration

The application uses the following build configuration:

- **Build Command**: `npm run build:prod`
- **Start Command**: `npm start`
- **Port**: 8080 (automatically configured)

## Monitoring

### Health Check

The application includes a health check endpoint at `/` that Railway uses to monitor the application.

### Error Handling

- Configuration errors are displayed with a user-friendly error page
- API errors are logged to the console
- Failed N8N webhook calls don't block lead creation

### Logs

View application logs in the Railway dashboard:
1. Go to your project
2. Click on "Deployments"
3. Select a deployment to view logs

## Troubleshooting

### Common Issues

1. **Configuration Error on Startup**
   - Check that all required environment variables are set
   - Verify Supabase URL and key are correct
   - Ensure variables are prefixed with `VITE_`

2. **Camera Not Working**
   - Ensure the deployed application is served over HTTPS
   - Check browser permissions for camera access
   - Verify the domain is trusted by the browser

3. **Database Connection Issues**
   - Verify Supabase project is active
   - Check RLS policies allow anonymous access
   - Ensure database tables exist with correct schema

4. **N8N Webhook Failures**
   - Check N8N webhook URLs are accessible
   - Verify webhook endpoints accept FormData
   - Check N8N service is running

### Performance Optimization

- The application uses code splitting for better loading performance
- Static assets are served efficiently
- Console logs are stripped in production builds

## Security Considerations

- All API keys are stored as environment variables
- Database access is controlled by Supabase RLS policies
- Camera permissions are requested explicitly
- No sensitive data is stored in the frontend code

## Updating the Application

To update the deployed application:

1. Push changes to your GitHub repository
2. Railway will automatically trigger a new deployment
3. Monitor the deployment logs for any issues
4. Test the application after deployment

## Support

For deployment issues:
- Check Railway documentation
- Review application logs in Railway dashboard
- Ensure all environment variables are correctly set
- Verify Supabase project configuration

## Production Checklist

Before going live on either platform:

### General Requirements
- [ ] All environment variables are set
- [ ] Supabase project is properly configured
- [ ] Database tables and storage buckets exist
- [ ] RLS policies are configured
- [ ] Camera functionality works over HTTPS
- [ ] N8N webhooks are tested (if using AI features)
- [ ] Error handling is working correctly
- [ ] Performance is acceptable
- [ ] Security measures are in place

### Netlify-Specific
- [ ] Build completes successfully
- [ ] SPA routing works correctly
- [ ] Environment variables are set in Netlify dashboard
- [ ] Custom domain is configured (if applicable)
- [ ] Form submissions work (if using Netlify Forms)
- [ ] Asset caching is working properly

### Railway-Specific
- [ ] Domain is configured (if using custom domain)
- [ ] Health checks are passing
- [ ] Server logs are clean
- [ ] Port configuration is correct 