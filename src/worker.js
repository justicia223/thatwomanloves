/**
 * thatwomanloves — Cloudflare Worker (Backend API)
 * =================================================
 * Routes:
 *   GET  /api/products          – fetch catalog (brand/category/price filter)
 *   POST /api/checkout          – create order, call Midtrans Snap, return token
 *   POST /api/midtrans-webhook  – Midtrans payment notification handler
 *   GET  /api/orders/:orderId   – check order status
 *   *    /*                     – serve static assets from /public (via Pages)
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function err(message, status = 400) {
  return json({ success: false, error: message }, status);
}

function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TWL-${ts}-${rnd}`;
}

// ── Midtrans Snap API ────────────────────────────────────────────────────────

async function createMidtransTransaction(serverKey, payload) {
  const auth = btoa(`${serverKey}:`);
  const url = "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Midtrans error ${res.status}: ${errBody}`);
  }
  return res.json();
}

// ── Midtrans Notification Verification ───────────────────────────────────────

async function verifyMidtransSignature(orderId, statusCode, grossAmount, serverKey) {
  const signatureString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Route Handlers ───────────────────────────────────────────────────────────

// GET /api/products
async function handleGetProducts(request, env) {
  const url = new URL(request.url);
  const brand    = url.searchParams.get("brand");
  const category = url.searchParams.get("category");
  const minPrice = parseFloat(url.searchParams.get("minPrice") || "0");
  const maxPrice = parseFloat(url.searchParams.get("maxPrice") || "999999999");
  const size     = url.searchParams.get("size");

  let query = "SELECT * FROM products WHERE price >= ? AND price <= ?";
  const params = [minPrice, maxPrice];

  if (brand) {
    query += " AND LOWER(brand) = LOWER(?)";
    params.push(brand);
  }
  if (category) {
    query += " AND LOWER(category) = LOWER(?)";
    params.push(category);
  }
  if (size) {
    query += " AND (',' || sizes || ',') LIKE ?";
    params.push(`%,${size},%`);
  }

  query += " ORDER BY brand, name";

  try {
    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Parse sizes CSV to array for each product
    const products = results.map((p) => ({
      ...p,
      sizes: p.sizes ? p.sizes.split(",").map((s) => s.trim()) : [],
      price_formatted: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(p.price),
    }));

    // Build distinct brand/category lists for filter UI
    const brands     = [...new Set(products.map((p) => p.brand))].sort();
    const categories = [...new Set(products.map((p) => p.category))].sort();

    return json({ success: true, products, brands, categories, total: products.length });
  } catch (e) {
    console.error("GET /api/products error:", e);
    return err(`Database error: ${e.message}`, 500);
  }
}

// POST /api/checkout
async function handleCheckout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const { customer, items } = body;

  // ── Validate customer ────────────────────────────────────────
  if (!customer?.name || !customer?.email || !customer?.phone) {
    return err("Missing customer fields: name, email, phone are required");
  }
  if (!Array.isArray(items) || items.length === 0) {
    return err("Cart is empty");
  }

  // ── Server-side price verification ──────────────────────────
  let totalAmount = 0;
  const itemDetails = [];

  for (const item of items) {
    if (!item.id || !item.quantity || item.quantity < 1) {
      return err(`Invalid cart item: ${JSON.stringify(item)}`);
    }
    const { results } = await env.DB.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).bind(item.id).all();

    if (results.length === 0) {
      return err(`Product not found: ID ${item.id}`);
    }
    const product = results[0];
    const subtotal = product.price * item.quantity;
    totalAmount += subtotal;

    itemDetails.push({
      id: String(product.id),
      price: Math.round(product.price),
      quantity: item.quantity,
      name: `${product.name} (EU ${item.size || "?"})`.substring(0, 50),
      brand: product.brand,
      category: product.category,
    });
  }

  const orderId = generateOrderId();

  // ── Build Midtrans payload ───────────────────────────────────
  const midtransPayload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(totalAmount),
    },
    item_details: itemDetails,
    customer_details: {
      first_name: customer.name.split(" ")[0],
      last_name:  customer.name.split(" ").slice(1).join(" ") || "",
      email:      customer.email,
      phone:      customer.phone,
    },
    credit_card: { secure: true },
    callbacks: {
      finish: `${new URL(request.url).origin}/success.html?order_id=${orderId}`,
    },
  };

  // ── Call Midtrans ────────────────────────────────────────────
  let snapToken, snapUrl;
  try {
    const mtRes = await createMidtransTransaction(
      "Mid-server-1OxMwLFkCbXHZdhbtqD9W7-a",
      midtransPayload
    );
    snapToken = mtRes.token;
    snapUrl   = mtRes.redirect_url;
  } catch (e) {
    console.error("Midtrans error:", e);
    return err(`Payment gateway error: ${e.message}`, 502);
  }

  // ── Persist order to D1 ──────────────────────────────────────
  try {
    await env.DB.prepare(`
      INSERT INTO orders
        (order_id, customer_name, customer_email, customer_phone, items, total_amount, status, midtrans_token, midtrans_url)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `)
    .bind(
      orderId,
      customer.name,
      customer.email,
      customer.phone,
      JSON.stringify(itemDetails),
      totalAmount,
      snapToken,
      snapUrl || ""
    )
    .run();
  } catch (e) {
    console.error("D1 insert error:", e);
    return err(`Database error: ${e.message}`, 500);
  }

  return json({
    success:   true,
    order_id:  orderId,
    snap_token: snapToken,
    snap_url:   snapUrl,
    total:     totalAmount,
  });
}

// POST /api/midtrans-webhook
async function handleMidtransWebhook(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON");
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
  } = body;

  // ── Verify signature ─────────────────────────────────────────
  const expectedSignature = await verifyMidtransSignature(
    order_id,
    status_code,
    gross_amount,
    env.MIDTRANS_SERVER_KEY
  );

  if (expectedSignature !== signature_key) {
    console.warn("Invalid Midtrans signature for order:", order_id);
    return err("Invalid signature", 403);
  }

  // ── Determine new status ─────────────────────────────────────
  let newStatus = "pending";
  if (transaction_status === "capture") {
    newStatus = fraud_status === "accept" ? "paid" : "fraud";
  } else if (transaction_status === "settlement") {
    newStatus = "paid";
  } else if (["cancel", "deny", "expire"].includes(transaction_status)) {
    newStatus = "cancelled";
  } else if (transaction_status === "pending") {
    newStatus = "pending";
  } else if (transaction_status === "failure") {
    newStatus = "failed";
  }

  // ── Update D1 ────────────────────────────────────────────────
  try {
    await env.DB.prepare(`
      UPDATE orders
      SET status = ?, updated_at = datetime('now')
      WHERE order_id = ?
    `)
    .bind(newStatus, order_id)
    .run();
  } catch (e) {
    console.error("Webhook D1 update error:", e);
    return err(`Database error: ${e.message}`, 500);
  }

  console.log(`Order ${order_id} updated to: ${newStatus}`);
  return json({ success: true, order_id, status: newStatus });
}

// GET /api/orders/:orderId
async function handleGetOrder(orderId, env) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT order_id, customer_name, total_amount, status, created_at FROM orders WHERE order_id = ?"
    ).bind(orderId).all();

    if (results.length === 0) {
      return err("Order not found", 404);
    }
    return json({ success: true, order: results[0] });
  } catch (e) {
    return err(`Database error: ${e.message}`, 500);
  }
}

// ── Main Fetch Handler ────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // ── API Routes ─────────────────────────────────────────────
    if (path === "/api/products" && method === "GET") {
      return handleGetProducts(request, env);
    }

    if (path === "/api/checkout" && method === "POST") {
      return handleCheckout(request, env);
    }

    if (path === "/api/midtrans-webhook" && method === "POST") {
      return handleMidtransWebhook(request, env);
    }

    const orderMatch = path.match(/^\/api\/orders\/(.+)$/);
    if (orderMatch && method === "GET") {
      return handleGetOrder(orderMatch[1], env);
    }

    // 404 for unknown API routes
    if (path.startsWith("/api/")) {
      return err("API endpoint not found", 404);
    }

    // ── Static Assets ──────────────────────────────────────────
    // In production on Cloudflare Pages, static files are served
    // automatically. This fallback handles wrangler dev mode.
    return new Response("Not Found", { status: 404 });
  },
};
