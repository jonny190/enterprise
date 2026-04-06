# Deploying Enterprise Requirements Platform on Coolify

This guide walks through deploying the Enterprise Requirements Platform to a Coolify instance with a Cloudflare proxy handling HTTPS.

## Prerequisites

- A running Coolify instance (this guide uses `coolify.daveys.xyz`)
- A PostgreSQL 16 database (can be provisioned through Coolify or externally)
- A Cloudflare account with a domain configured (for HTTPS termination)
- The following credentials ready:
  - Anthropic API key (for AI generation)
  - Azure AD app registration (for email sending via Microsoft Graph)
  - NextAuth secret (generate with `openssl rand -base64 32`)

## Step 1: Provision the Database

If you don't already have a PostgreSQL instance, create one in Coolify:

1. Go to your Coolify dashboard and select your team/project
2. Click **New Resource** and choose **Database > PostgreSQL**
3. Select the `postgres:16-alpine` image
4. Set a database name (e.g. `enterprise`), username, and password
5. Deploy it and note the internal connection URL - it will look something like:
   ```
   postgresql://postgres:yourpassword@your-db-host:5432/enterprise
   ```

If the database is on the same Coolify server, use the internal Docker network hostname rather than `localhost`.

## Step 2: Create the Application Resource

1. In Coolify, click **New Resource** and choose **Application**
2. Select your Git provider (GitHub) and pick the `enterprise` repository
3. Set the branch to `master` (or whichever branch you deploy from)
4. Coolify will detect the `Dockerfile` automatically - leave the build pack as **Dockerfile**

## Step 3: Configure Build Settings

Under the application's **General** settings:

- **Build Pack:** Dockerfile
- **Dockerfile Location:** `/Dockerfile`
- **Port Exposes:** `3000`
- **Port Mappings:** Leave empty (Coolify's proxy handles routing)

Under **Build Arguments**, add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your PostgreSQL connection string |

This is needed because Prisma migrations run during the Docker build step. The `Dockerfile` conditionally runs `npx prisma migrate deploy` when `DATABASE_URL` is present as a build arg.

## Step 4: Set Environment Variables

Go to the **Environment Variables** section and add all of the following:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@db:5432/enterprise` |
| `NEXTAUTH_URL` | Public URL of the app | `http://enterprise.coria.app` |
| `NEXTAUTH_SECRET` | Random secret for JWT signing | Output of `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | `sk-ant-...` |
| `NEXT_PUBLIC_APP_URL` | Public URL (used client-side) | `http://enterprise.coria.app` |

### Email (Microsoft Graph)

| Variable | Description |
|----------|-------------|
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | Azure AD app client ID |
| `AZURE_CLIENT_SECRET` | Azure AD app client secret |
| `AZURE_SENDER_EMAIL` | The email address to send from |

**Important:** Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to `http://` (not `https://`). Cloudflare's tunnel handles HTTPS termination before traffic reaches Coolify, so the app itself runs on plain HTTP.

Mark sensitive values (secrets, API keys, passwords) as **Secret** so they are masked in the Coolify UI.

## Step 5: Configure the Domain

Under the application's **General** settings:

1. Set the domain to `http://enterprise.coria.app` (or your chosen domain)
2. Make sure the protocol is `http` since Cloudflare handles SSL/TLS

In Coolify's proxy settings, ensure:
- The proxy forwards to container port `3000`
- No SSL certificate is configured on the Coolify side (Cloudflare does this)

## Step 6: Configure Cloudflare

In the Cloudflare dashboard for your domain:

1. **DNS:** Add an A record or CNAME pointing `enterprise.coria.app` to your Coolify server's IP. Make sure the orange cloud (proxy) is enabled.
2. **SSL/TLS:** Set the encryption mode to **Flexible** or **Full** depending on your setup:
   - **Flexible** if Coolify does not have its own SSL cert (recommended for this setup)
   - **Full** if you have a cert on Coolify
3. **Edge Certificates:** Ensure "Always Use HTTPS" is enabled so visitors are redirected from HTTP to HTTPS

## Step 7: Deploy

1. Back in Coolify, click **Deploy** on the application
2. Watch the build logs - you should see:
   - Dependencies installing (`npm ci`)
   - Prisma client generating (`npx prisma generate`)
   - Database migrations running (`npx prisma migrate deploy`)
   - Next.js building (`npm run build`)
   - The slim runner image being created
3. Once deployed, the app should be available at `https://enterprise.coria.app`

## Step 8: Verify the Deployment

1. Visit `https://enterprise.coria.app` - you should see the login page
2. Try registering a new account (this also verifies email sending works)
3. Check that you can create an organization and project
4. Test AI generation on a project to confirm the Anthropic API key is working

## Automatic Deployments

Coolify can automatically deploy when you push to your configured branch:

1. In the application settings, enable **Auto Deploy**
2. Coolify sets up a webhook on your GitHub repository
3. Every push to `master` triggers a new build and deployment

## Troubleshooting

### Build fails at migration step

- Check that `DATABASE_URL` is set as a **Build Argument** (not just an environment variable)
- Verify the database is accessible from the Coolify build environment
- Check that the connection string is correct and the database exists

### App starts but shows a database error

- Confirm `DATABASE_URL` is set as a runtime environment variable as well
- Make sure the database is reachable from the running container (use internal Docker hostnames if on the same server)

### Email verification not sending

- Double-check all four Azure environment variables
- Verify the Azure AD app has `Mail.Send` permission granted with admin consent
- Check that `AZURE_SENDER_EMAIL` is a valid mailbox in your tenant

### Cloudflare 522 or 502 errors

- Confirm the Coolify proxy is running and the container is healthy
- Check that the domain in Coolify matches what Cloudflare is sending traffic to
- Verify port 3000 is exposed correctly in the container

### "NEXTAUTH_URL mismatch" or session issues

- Make sure `NEXTAUTH_URL` uses `http://` (not `https://`) since Cloudflare terminates TLS
- The URL must match exactly what users see in their browser (minus the protocol difference handled by Cloudflare)

## Updating the Application

To deploy a new version:

1. Push your changes to the `master` branch
2. If auto-deploy is on, Coolify picks it up automatically
3. Otherwise, click **Deploy** in the Coolify dashboard
4. Prisma migrations run automatically during build, so schema changes are applied on each deploy

## Database Backups

Coolify can schedule automatic database backups:

1. Go to your PostgreSQL resource in Coolify
2. Under **Backups**, configure a schedule (e.g. daily)
3. Set a retention policy to avoid filling disk space
4. Consider also storing backups off-server (S3 or similar) for disaster recovery
