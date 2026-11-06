#!/usr/bin/env bash
# Loads a small catalogue and a few orders into a running API (default http://localhost:8080).
set -euo pipefail
API="${API_URL:-http://localhost:8080}"

product() {
  curl -fsS -o /dev/null -X POST "$API/api/products" -H 'Content-Type: application/json' \
    -d "{\"sku\":\"$1\",\"name\":\"$2\",\"category\":\"$3\",\"price\":$4,\"stock\":$5}" || echo "skipped $1 (exists?)"
}
order() {
  curl -fsS -o /dev/null -X POST "$API/api/orders" -H 'Content-Type: application/json' \
    -H "Idempotency-Key: seed-$1" -d "{\"customerId\":\"$2\",\"items\":$3}"
}

product KB-MECH-87  "Mechanical keyboard, 87 keys" electronics 3499.00 25
product MS-WL-01    "Wireless mouse"               electronics  899.00 40
product MON-27-4K   "27-inch 4K monitor"           electronics 24999.00 6
product HUB-USBC-7  "USB-C hub, 7 ports"           electronics 1799.00 3
product BK-DDIA     "Designing Data-Intensive Applications" books 1650.00 12
product BK-EFFJAVA  "Effective Java, 3rd edition"  books 1150.00 2
product DSK-LAMP-LED "LED desk lamp"               home 1299.00 18
product CHR-ERGO    "Ergonomic office chair"       home 12999.00 0

order 1 cust-1042 '[{"sku":"KB-MECH-87","quantity":2},{"sku":"MS-WL-01","quantity":2}]'
order 2 cust-1042 '[{"sku":"MON-27-4K","quantity":1}]'
order 3 cust-2001 '[{"sku":"BK-DDIA","quantity":3},{"sku":"BK-EFFJAVA","quantity":1}]'
order 4 cust-2001 '[{"sku":"DSK-LAMP-LED","quantity":2}]'
echo "seeded $API"
