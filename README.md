# 🩰 thatwomanloves

> *A curated luxury heels boutique — Barbiecore meets high fashion.*

Built with **Cloudflare Workers + D1 + Pages**, powered by **Midtrans Snap** for payments.

---

## ✦ Tech Stack

| Layer         | Technology                         |
|---------------|------------------------------------|
| Front-End     | Vanilla HTML / CSS / JS (static)   |
| Hosting       | Cloudflare Pages                   |
| Backend API   | Cloudflare Workers (serverless)    |
| Database      | Cloudflare D1 (SQLite)             |
| Payments      | Midtrans Snap API (Sandbox)        |
| CI/CD         | GitHub → Cloudflare Pages auto-deploy |

---

## ✦ Project Structure

```
thatwomanloves/
├── public/                  # Static front-end assets (served by Cloudflare Pages)
│   ├── index.html           # Main store page
│   ├── success.html         # Order confirmation page
│   ├── style.css            # Barbiecore aesthetics stylesheet
│   └── app.js               # Frontend application logic
│
├── src/
│   └── worker.js            # Cloudflare Worker (REST API backend)
│
├── schema.sql               # D1 database schema + seed data (17 luxury heels)
├── wrangler.toml            # Cloudflare Wrangler configuration
├── package.json             # NPM scripts for dev/deploy
├── .gitignore
└── README.md
```

---

## ✦ API Endpoints

| Method | Endpoint                  | Description                                          |
|--------|---------------------------|------------------------------------------------------|
| GET    | `/api/products`           | Fetch product catalog. Supports query params:        |
|        |                           | `brand`, `category`, `size`, `minPrice`, `maxPrice`  |
| POST   | `/api/checkout`           | Create order, call Midtrans, return `snap_token`     |
| POST   | `/api/midtrans-webhook`   | Handle Midtrans payment notification (update order status) |
| GET    | `/api/orders/:orderId`    | Check a specific order status                        |

### POST `/api/checkout` — Request Body
```json
{
  "customer": {
    "name": "Sofia Rose",
    "email": "sofia@example.com",
    "phone": "+62812345678"
  },
  "items": [
    { "id": 1, "quantity": 1, "size": "37" }
  ]
}
```

### POST `/api/checkout` — Response
```json
{
  "success": true,
  "order_id": "TWL-XXXXXX-XXXX",
  "snap_token": "...",
  "snap_url": "https://app.sandbox.midtrans.com/snap/...",
  "total": 895000
}
```

---

## ✦ Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): `npm install -g wrangler`
- Cloudflare account (free tier works)
- Midtrans Sandbox account — [register here](https://account.midtrans.com/register)
- GitHub account

---

## ✦ Step-by-Step Deployment Guide

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/thatwomanloves.git
cd thatwomanloves
npm install
```

### 2. Cloudflare Login

```bash
wrangler login
```
This opens a browser window to authenticate with your Cloudflare account.

### 3. Create the D1 Database

```bash
wrangler d1 create thatwomanloves-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "thatwomanloves-db"
database_id   = "PASTE_YOUR_ID_HERE"   # ← replace this
```

### 4. Run Database Migrations (Schema + Seed Data)

**Local (dev) database:**
```bash
npm run db:migrate
# or: wrangler d1 execute thatwomanloves-db --file=./schema.sql
```

**Remote (production) database:**
```bash
npm run db:migrate:remote
# or: wrangler d1 execute thatwomanloves-db --remote --file=./schema.sql
```

Verify the data loaded correctly:
```bash
wrangler d1 execute thatwomanloves-db --remote --command="SELECT name, brand, price FROM products LIMIT 5;"
```

### 5. Configure Midtrans Keys

#### Get your Midtrans keys:
1. Go to [Midtrans Sandbox Dashboard](https://dashboard.sandbox.midtrans.com/)
2. Settings → Access Keys
3. Copy your **Server Key** (`SB-Mid-server-...`) and **Client Key** (`SB-Mid-client-...`)

#### Set the Server Key as a Worker Secret (never commit this!):
```bash
wrangler secret put MIDTRANS_SERVER_KEY
# Paste: SB-Mid-server-XXXXXXXXXXXXXXXXXXXX
```

#### Set the Client Key in the frontend:
Open `public/index.html` and replace:
```html
data-client-key="YOUR_MIDTRANS_CLIENT_KEY"
```
with your actual Midtrans Client Key:
```html
data-client-key="SB-Mid-client-XXXXXXXXXXXXXXXXXXXX"
```

#### For local development, create a `.dev.vars` file (already gitignored):
```
MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXXXXXXXXXXXXXXXXX
```

### 6. Local Development

```bash
npm run dev
# Starts wrangler dev at http://localhost:8787
```

Open your browser at `http://localhost:8787` to see the store.

### 7. Deploy the Worker

```bash
npm run deploy
# or: wrangler deploy
```

### 8. Push to GitHub

```bash
git init
git add .
git commit -m "✨ Initial commit — thatwomanloves luxury heels store"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/thatwomanloves.git
git push -u origin main
```

### 9. Deploy Front-End via Cloudflare Pages

#### Option A — Cloudflare Pages Dashboard (recommended)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Pages** → **Create a project**
2. Connect your GitHub repository
3. Set **Build output directory**: `public`
4. Leave Build command empty (no build step — pure static)
5. Click **Save and Deploy**

#### Option B — Wrangler CLI
```bash
wrangler pages deploy public --project-name=thatwomanloves
```

### 10. Connect the Worker to Pages

In your Pages project settings:
1. Go to **Settings** → **Functions** → **KV namespace bindings** (if needed)
2. Or ensure the Worker is deployed separately and CORS allows your Pages domain

> **Tip**: For a seamless integration, you can use **Cloudflare Pages Functions** — place your `worker.js` logic into `functions/api/` following the Pages Functions file structure. The Worker and Pages would then share the same D1 binding automatically.

### 11. Custom Domain (`thatwomanloves.com`)

1. In Cloudflare Dashboard → **Pages** → your project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter `thatwomanloves.com`
4. If your domain is registered with Cloudflare, DNS is configured automatically
5. For external registrars, add a CNAME: `thatwomanloves.com → your-project.pages.dev`
6. SSL/TLS is provisioned automatically ✦

---

## ✦ Configure Midtrans Webhook

In [Midtrans Dashboard](https://dashboard.sandbox.midtrans.com/) → Settings → Configuration:

| Field | Value |
|-------|-------|
| Payment Notification URL | `https://thatwomanloves.com/api/midtrans-webhook` |
| Finish Redirect URL | `https://thatwomanloves.com/success.html` |
| Error Redirect URL | `https://thatwomanloves.com/?payment=failed` |
| Unfinish Redirect URL | `https://thatwomanloves.com/?payment=pending` |

---

## ✦ Product Catalog

The seed data includes **17 iconic luxury heels** across:

| Brand | Products |
|-------|---------|
| Sophia Webster | Chiara Butterfly Wings Stiletto, Evangeline Angel Wing Pump, Jumbo Lilico Floral Mule |
| Versace | Aevitas Double Platform Pumps, Medusa Biggie Slingback Heels |
| Naked Wolfe | Spice Black/Pink Chunky Platform Boots, Annette Leather Mules |
| René Caovilla | Cleo Crystal Snake Wrap Sandal, Margaritha Beaded Stiletto |
| Steve Madden | Bejeweled Clear Glass Pumps, Blush Pink Espadrille Wedges, Cyber Platform Heels |
| Windsor Smith | Luella Chunky Strappy Heels, Racqual Pink Platform Mules |
| Valentino | Tan-Go Platform Pumps |
| Louboutin | Pigalle Patent Pink Pumps |

All prices are in IDR. Sizes range EU 35–42.

---

## ✦ Environment Variables Reference

| Variable | Where to set | Description |
|----------|-------------|-------------|
| `MIDTRANS_SERVER_KEY` | `wrangler secret put` | Midtrans Sandbox Server Key |
| D1 `database_id` | `wrangler.toml` | Your D1 database UUID |
| Midtrans `data-client-key` | `public/index.html` | Midtrans Sandbox Client Key (public, safe in HTML) |

---

## ✦ Switching to Midtrans Production

When ready for real payments:
1. Change the Snap.js URL in `index.html`:
   - Sandbox: `https://app.sandbox.midtrans.com/snap/snap.js`
   - Production: `https://app.midtrans.com/snap/snap.js`
2. Change the API URL in `worker.js` `createMidtransTransaction()`:
   - Sandbox: `https://app.sandbox.midtrans.com/snap/v1/transactions`
   - Production: `https://app.midtrans.com/snap/v1/transactions`
3. Update your `MIDTRANS_SERVER_KEY` secret to your production server key.

---

## ✦ License

MIT — made with love for the woman who knows exactly what she wants 🩰

---

*thatwomanloves · curated luxury heels · ♡*
