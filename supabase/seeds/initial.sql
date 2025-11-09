INSERT INTO "public"."subscription_plans" 
("created_at", "updated_at", "name", "slug", "description", "stripe_product_id", "daily_interactions_limit", "features", "active") 
VALUES 
('now()', 'now()', 'Plano Básico', 'basic', 'Ideal para uso pessoal e exploração básica da IA nutricional', 'prod_T5oFYGHjMmUSRh', '50', '["50 interações por dia", "Suporte via email"]', 'true'), 
('now()', 'now()', 'Plano Pro', 'pro', 'Para profissionais e uso intensivo da IA nutricional', 'prod_T5oGVUib2y8dA5', '75', '["75 interações por dia", "Suporte prioritário"]', 'true');

INSERT INTO "public"."subscription_plan_prices"
("plan_id", "stripe_price_id", "amount_cents", "currency", "billing_interval", "is_current", "created_at", "deprecated_at")
SELECT id, 'price_1S9cdIJeULi1BqtMlYR9L64U', '19999', 'brl', 'month', 'true', '2025-10-02 10:00:00+00', null
FROM "public"."subscription_plans" WHERE slug = 'basic' LIMIT 1;

INSERT INTO "public"."subscription_plan_prices"
("plan_id", "stripe_price_id", "amount_cents", "currency", "billing_interval", "is_current", "created_at", "deprecated_at")
SELECT id, 'price_1S9cdaJeULi1BqtMzRbb5M29', '79999', 'brl', 'month', 'true', '2025-10-02 10:00:00+00', null
FROM "public"."subscription_plans" WHERE slug = 'pro' LIMIT 1;