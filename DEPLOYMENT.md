# Deployment Guide & Free Hosting Recommendations

This guide explains how to deploy the **CopilOPS Aeronautical Data Platform** (Node.js/Express, React/TypeScript, MongoDB/Mongoose) to a publicly accessible free hosting service.

---

## 1. Hosting Service Comparison & Recommendations

| Service | Best For | Free Tier Details | Ease of Setup | Recommended |
|---|---|---|:---:|:---:|
| **Render.com** + **MongoDB Atlas** | **Full-Stack Container** | 750 free instance hrs/month, native Docker support + 512MB free MongoDB Atlas | ⭐⭐⭐⭐⭐ (5 min) | **#1 Recommended** |
| **Vercel** / **Netlify** | **Instant Frontend Demo** | 100 GB bandwidth, infinite free preview deployments | ⭐⭐⭐⭐⭐ (2 min) | **Easiest for quick demo** |
| **Railway.app** | **Docker PaaS** | $5 free trial credit, instant Dockerfile deployment | ⭐⭐⭐⭐ (5 min) | Alternative |
| **Fly.io** | **Global Edge Containers** | Free micro VM allocation with Docker | ⭐⭐⭐ (10 min) | Alternative |

---

## 2. Option 1: Render.com + MongoDB Atlas (Recommended Full-Stack)

Render natively builds and runs the project's [Dockerfile](file:///c:/Users/spfar/Desktop/copilops-aip/Dockerfile) for free, serving both the React SPA and Express REST API from a single public URL.

### Step-by-Step Instructions:

#### Step 2.1: Setup Free MongoDB on MongoDB Atlas (2 minutes)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for free.
2. Create a free **M0 Shared Cluster** (free forever, AWS/GCP, Frankfurt or Ireland region).
3. Under **Database Access**, create a user (e.g. `copilops_admin` with password).
4. Under **Network Access**, click **Add IP Address** $\rightarrow$ select **Allow Access from Anywhere (`0.0.0.0/0`)**.
5. Click **Connect** $\rightarrow$ **Drivers** $\rightarrow$ copy your connection string:
   ```
   mongodb+srv://copilops_admin:<password>@cluster0.abcde.mongodb.net/copilops_aip?retryWrites=true&w=majority
   ```

#### Step 2.2: Deploy to Render.com (3 minutes)
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "CopilOPS aeronautical data platform complete"
   git remote add origin https://github.com/<your-username>/copilops-aip.git
   git push -u origin main
   ```
2. Go to [render.com](https://render.com) $\rightarrow$ sign up $\rightarrow$ click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   * **Name:** `copilops-aip`
   * **Environment:** `Docker` (Render automatically detects the root `Dockerfile`)
   * **Region:** Frankfurt (EU Central)
   * **Branch:** `main`
   * **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   * `NODE_ENV` = `production`
   * `PORT` = `5000`
   * `MONGODB_URI` = `<your MongoDB Atlas connection string from Step 2.1>`
6. Click **Create Web Service**.
7. Render will build the multi-stage Docker container and give you a public URL like:
   `https://copilops-aip.onrender.com`

### Environment Variables for Render.com

| Variable Name | Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production Express mode |
| `PORT` | `5000` | Port listened to by container |
| `MONGODB_URI` | `mongodb+srv://...` | Connection string from MongoDB Atlas (Optional: falls back to embedded data if omitted) |

> For the full 28-day AIRAC refresh and automation lifecycle, see [AUTOMATION.md](file:///c:/Users/spfar/Desktop/copilops-aip/AUTOMATION.md).

---

## 3. Option 2: GitHub Pages (Instant Free Portfolio Demo)

If you need a live public URL in under 2 minutes:

1. Install Vercel CLI or import repository at [vercel.com](https://vercel.com).
2. Configure project settings:
   * **Framework Preset:** Vite
   * **Root Directory:** `client`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
3. Click **Deploy**.
4. The React application will be live at `https://copilops-aip.vercel.app` with all interactive maps, airport dashboards, and AIRAC diff tools functioning out of the box.

---

## 4. Local Verification & Docker Compose

To run the full stack locally with MongoDB using Docker (optional):

```bash
# Build and run application + MongoDB containers
docker-compose up --build

# Open in browser:
# http://localhost:5000
```
