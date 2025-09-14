API ?= https://api.dev.ventalocal.com.ar

.PHONY: meili-bootstrap
meili-bootstrap:
	curl -s -X POST "$(MEILI_HOST)/indexes"     	 -H "Authorization: Bearer $(MEILI_MASTER_KEY)"     	 -H "Content-Type: application/json"     	 -d '{"uid":"vl_products"}' || true
	curl -s -X PATCH "$(MEILI_HOST)/indexes/vl_products/settings"     	 -H "Authorization: Bearer $(MEILI_MASTER_KEY)"     	 -H "Content-Type: application/json"     	 -d '{ "searchableAttributes":["name","description"], "filterableAttributes":["tenant_id","category_id","price_cents","featured","status","created_at"], "sortableAttributes":["price_cents","created_at"] }' >/dev/null

.PHONY: health
health:
	curl -sf $(API)/healthz && echo "✓ healthz"

.PHONY: smoke
smoke:
	curl -sf $(API)/api/products >/dev/null && echo "✓ /products"
	curl -sf "$(API)/api/search?q=test" >/dev/null && echo "✓ /search"
