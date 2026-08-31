CREATE OR REPLACE FUNCTION public.validate_proof_and_credit(
  p_proof_id uuid,
  p_user_id uuid,
  p_campaign_id uuid,
  p_views integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cpv numeric;
  v_earnings numeric;
  v_remaining numeric;
  v_current_views integer;
  v_new_balance numeric;
  v_new_total numeric;
BEGIN
  SELECT cpv, remainingBudget, viewsCurrent
  INTO v_cpv, v_remaining, v_current_views
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'campaign_not_found');
  END IF;

  v_earnings := p_views * v_cpv;

  IF v_earnings > v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_budget', 'max_views', floor(v_remaining / v_cpv));
  END IF;

  UPDATE proofs
  SET status = 'validated', "viewsCount" = p_views
  WHERE id = p_proof_id AND "userId" = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'proof_not_found');
  END IF;

  UPDATE users
  SET balance = balance + v_earnings,
      "totalEarned" = "totalEarned" + v_earnings
  WHERE id = p_user_id
  RETURNING balance, "totalEarned" INTO v_new_balance, v_new_total;

  UPDATE campaigns
  SET "remainingBudget" = v_remaining - v_earnings,
      "viewsCurrent" = v_current_views + p_views
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'success', true,
    'earnings', v_earnings,
    'new_balance', v_new_balance,
    'views', p_views
  );
END;
$$;
