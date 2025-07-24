-- Migration pour ajouter le système de facturation Stripe
-- Cette table stocke toutes les factures et données de paiement

-- 1. Créer la table des factures Stripe
CREATE TABLE public.stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id UUID REFERENCES public.stripe_subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Données de facturation
  invoice_number TEXT,
  description TEXT,
  amount_due INTEGER NOT NULL, -- En centimes
  amount_paid INTEGER DEFAULT 0, -- En centimes
  amount_remaining INTEGER DEFAULT 0, -- En centimes
  currency TEXT NOT NULL DEFAULT 'eur',
  
  -- Dates importantes
  invoice_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Status et URLs
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  hosted_invoice_url TEXT, -- URL hébergée chez Stripe
  invoice_pdf TEXT, -- URL du PDF
  
  -- Informations de période (pour les abonnements)
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Métadonnées et flags
  auto_advance BOOLEAN DEFAULT true,
  collection_method TEXT DEFAULT 'charge_automatically',
  attempt_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer des index pour optimiser les requêtes
CREATE INDEX idx_stripe_invoices_user_id ON public.stripe_invoices(user_id);
CREATE INDEX idx_stripe_invoices_subscription_id ON public.stripe_invoices(stripe_subscription_id);
CREATE INDEX idx_stripe_invoices_customer_id ON public.stripe_invoices(stripe_customer_id);
CREATE INDEX idx_stripe_invoices_status ON public.stripe_invoices(status);
CREATE INDEX idx_stripe_invoices_invoice_date ON public.stripe_invoices(invoice_date);
CREATE INDEX idx_stripe_invoices_paid_at ON public.stripe_invoices(paid_at);

-- 3. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_stripe_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stripe_invoices_updated_at
  BEFORE UPDATE ON public.stripe_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_invoices_updated_at();

-- 4. Fonction pour créer/mettre à jour une facture Stripe
CREATE OR REPLACE FUNCTION upsert_stripe_invoice(
  p_user_id UUID,
  p_stripe_subscription_id UUID DEFAULT NULL,
  p_stripe_invoice_id TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_charge_id TEXT DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_amount_due INTEGER DEFAULT 0,
  p_amount_paid INTEGER DEFAULT 0,
  p_amount_remaining INTEGER DEFAULT 0,
  p_currency TEXT DEFAULT 'eur',
  p_invoice_date TIMESTAMPTZ DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_paid_at TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT 'draft',
  p_hosted_invoice_url TEXT DEFAULT NULL,
  p_invoice_pdf TEXT DEFAULT NULL,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NULL,
  p_auto_advance BOOLEAN DEFAULT true,
  p_collection_method TEXT DEFAULT 'charge_automatically',
  p_attempt_count INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  invoice_id UUID;
  subscription_uuid UUID;
BEGIN
  -- Trouver l'UUID de l'abonnement si fourni
  IF p_stripe_subscription_id IS NOT NULL THEN
    SELECT id INTO subscription_uuid 
    FROM public.stripe_subscriptions 
    WHERE stripe_subscription_id = p_stripe_subscription_id::TEXT;
  END IF;

  INSERT INTO public.stripe_invoices (
    user_id, stripe_subscription_id, stripe_invoice_id, stripe_customer_id,
    stripe_charge_id, stripe_payment_intent_id, invoice_number, description,
    amount_due, amount_paid, amount_remaining, currency,
    invoice_date, due_date, paid_at, status,
    hosted_invoice_url, invoice_pdf, period_start, period_end,
    auto_advance, collection_method, attempt_count, metadata
  )
  VALUES (
    p_user_id, subscription_uuid, p_stripe_invoice_id, p_stripe_customer_id,
    p_stripe_charge_id, p_stripe_payment_intent_id, p_invoice_number, p_description,
    p_amount_due, p_amount_paid, p_amount_remaining, p_currency,
    p_invoice_date, p_due_date, p_paid_at, p_status,
    p_hosted_invoice_url, p_invoice_pdf, p_period_start, p_period_end,
    p_auto_advance, p_collection_method, p_attempt_count, p_metadata
  )
  ON CONFLICT (stripe_invoice_id) DO UPDATE SET
    stripe_charge_id = EXCLUDED.stripe_charge_id,
    stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
    invoice_number = EXCLUDED.invoice_number,
    description = EXCLUDED.description,
    amount_due = EXCLUDED.amount_due,
    amount_paid = EXCLUDED.amount_paid,
    amount_remaining = EXCLUDED.amount_remaining,
    due_date = EXCLUDED.due_date,
    paid_at = EXCLUDED.paid_at,
    status = EXCLUDED.status,
    hosted_invoice_url = EXCLUDED.hosted_invoice_url,
    invoice_pdf = EXCLUDED.invoice_pdf,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    auto_advance = EXCLUDED.auto_advance,
    collection_method = EXCLUDED.collection_method,
    attempt_count = EXCLUDED.attempt_count,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO invoice_id;
  
  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vue pour faciliter les requêtes sur les factures avec détails abonnement
CREATE OR REPLACE VIEW public.invoices_with_subscription_details AS
SELECT 
  i.*,
  s.stripe_subscription_id as subscription_stripe_id,
  s.status as subscription_status,
  s.stripe_price_id,
  u.email as user_email,
  COALESCE(up.first_name, u.raw_user_meta_data->>'first_name') as user_first_name,
  COALESCE(up.last_name, u.raw_user_meta_data->>'last_name') as user_last_name
FROM public.stripe_invoices i
LEFT JOIN public.stripe_subscriptions s ON i.stripe_subscription_id = s.id
LEFT JOIN auth.users u ON i.user_id = u.id
LEFT JOIN public.user_profiles up ON i.user_id = up.user_id;

-- 6. Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_invoices TO service_role;
GRANT EXECUTE ON FUNCTION upsert_stripe_invoice TO service_role;
GRANT SELECT ON public.invoices_with_subscription_details TO service_role;

-- 7. RLS (Row Level Security)
ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés (lecture seule de leurs propres factures)
CREATE POLICY "Users can view their own invoices" ON public.stripe_invoices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Politique pour service_role (accès complet)
CREATE POLICY "Service role has full access" ON public.stripe_invoices
  FOR ALL TO service_role
  USING (true);

-- RLS pour la vue
ALTER VIEW public.invoices_with_subscription_details SET (security_barrier = true);
GRANT SELECT ON public.invoices_with_subscription_details TO authenticated;

-- 8. Commentaires pour documentation
COMMENT ON TABLE public.stripe_invoices IS 'Table des factures Stripe avec toutes les données de facturation et liens PDF';
COMMENT ON FUNCTION upsert_stripe_invoice IS 'Fonction pour créer ou mettre à jour une facture Stripe depuis les webhooks';
COMMENT ON VIEW public.invoices_with_subscription_details IS 'Vue combinant factures et détails abonnements pour faciliter les requêtes';