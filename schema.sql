-- ============================================================
-- thatwomanloves — Cloudflare D1 Schema & Seed Data
-- ============================================================

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  brand         TEXT    NOT NULL,
  price         REAL    NOT NULL,
  category      TEXT    NOT NULL,
  image_url     TEXT    NOT NULL DEFAULT '',
  description   TEXT    NOT NULL DEFAULT '',
  sizes         TEXT    NOT NULL DEFAULT '35,36,37,38,39,40,41,42',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  order_id        TEXT  PRIMARY KEY,
  customer_name   TEXT  NOT NULL,
  customer_email  TEXT  NOT NULL DEFAULT '',
  customer_phone  TEXT  NOT NULL DEFAULT '',
  items           TEXT  NOT NULL DEFAULT '[]',
  total_amount    REAL  NOT NULL,
  status          TEXT  NOT NULL DEFAULT 'pending',
  midtrans_token  TEXT  NOT NULL DEFAULT '',
  midtrans_url    TEXT  NOT NULL DEFAULT '',
  created_at      TEXT  NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT  NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SEED DATA -- Iconic Luxury Heels Catalog
-- ============================================================

INSERT INTO products (name, brand, price, category, image_url, description, sizes) VALUES


(
  'Evangeline Angel Wing Pump',
  'Sophia Webster',
  975000,
  'Stilettos',
  'https://i.pinimg.com/1200x/3c/74/87/3c74878b26ea9baae64f1b6b7c749f86.jpg',
  'Feathered angel wings take flight on this ethereal ivory pump. Crafted from soft leather with a curved kitten heel and sweetheart toe.',
  '35,36,37,38,39,40'
),
(
  'Medusa Biggie Slingback Heels',
  'Versace',
  1650000,
  'Stilettos',
  'https://i.pinimg.com/736x/5e/bd/8d/5ebd8d40576174e5fd07a97682c23f38.jpg',
  'Baroque Medusa head embossed on the toe cap with a slim stiletto heel wrapped in gold hardware. Vintage glamour reimagined for the modern goddess.',
  '35,36,37,38,39,40,41'
),
(
  'Spice Black Stretch',
  'Naked Wolfe',
  1250000,
  'Platforms',
  'https://i.pinimg.com/1200x/b3/62/ac/b362ac76aa8a97c55f8c7738401dd9bb.jpg',
  'Y2K energy maximised: towering lug-sole platform in matte black with bubblegum-pink hardware and a chunky heel. Lace-up front and padded ankle collar.',
  '36,37,38,39,40,41,42'
),
(
  'Cleo Crystal Snake Wrap Sandal',
  'Rene Caovilla',
  2250000,
  'Stilettos',
  'https://i.pinimg.com/736x/10/0e/f9/100ef9ed08b8d5eedf9b5d93e9c2510d.jpg',
  'Swarovski crystals cascade along a serpentine strap that winds sensuously up the ankle. A hand-crafted 10 cm stiletto with open vamp for maximum skin-to-sparkle ratio.',
  '35,36,37,38,39,40'
),
(
  'Margaritha Beaded Stiletto',
  'Rene Caovilla',
  1980000,
  'Stilettos',
  'https://i.pinimg.com/736x/dd/ed/8a/dded8a3efd0d1d39b1ca7e15ed9d6cf7.jpg',
  'Hand-embroidered floral beading in rose gold and blush covers every inch of this pointed-toe stiletto. Each pair takes over 12 hours to complete.',
  '35,36,37,38,39,40,41'
),
(
  'Blush Pink Espadrille Wedges',
  'Steve Madden',
  480000,
  'Wedges',
  'https://i.pinimg.com/736x/33/fa/94/33fa940421f218cf1a0a9ff7af5c237d.jpg',
  'Sun-soaked Riviera vibes wrapped in soft blush canvas with a natural jute-wrapped wedge heel and gold buckle ankle strap.',
  '35,36,37,38,39,40,41,42'
),
(
  'Racqual Platform Mules',
  'Windsor Smith',
  820000,
  'Platforms',
  'https://i.pinimg.com/736x/76/4a/5f/764a5f851bf15a82565e41e133706471.jpg',
  'Wide-fit platform silhouette in dusty rose leather with open-toe front and walk-all-day padded footbed. Elevated comfort in the most literal sense.',
  '35,36,37,38,39,40,41,42'
),
(
  'Tan-Go Platform Pumps',
  'Valentino',
  1750000,
  'Platforms',
  'https://i.pinimg.com/736x/b7/2c/7a/b72c7a1df7fa16ff0c831ee9b2684bd3.jpg',
  'Rose quilted nappa leather with tonal stitching and the VLogo Signature medallion. A 155 mm platform pump that redefines luxury street style.',
  '35,36,37,38,39,40,41'
),
(
  'Pigalle Patent Pink Pumps',
  'Louboutin',
  1950000,
  'Stilettos',
  'https://i.pinimg.com/736x/f5/58/b6/f558b67482d6b4c0d9a3f9b80f11f92e.jpg',
  'Shocking pink patent leather, sharply pointed toe, ultra-slim 120mm stiletto, and that legendary red lacquered sole. Timeless. Iconic. Unmistakably Louboutin.',
  '35,36,37,38,39,40,41'
);
