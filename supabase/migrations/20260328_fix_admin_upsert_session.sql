-- Fix: admin_upsert_session utilisait user_id qui n'existe pas dans sessions
-- La table sessions utilise campaign_id, pas user_id

CREATE OR REPLACE FUNCTION admin_upsert_session(
	p_user_id uuid,
	p_id uuid,
	p_number int,
	p_title text,
	p_summary text,
	p_dm_notes text,
	p_date_played date,
	p_xp_awarded int,
	p_visibility text,
	p_attachments jsonb,
	p_campaign text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
	v_campaign_id uuid;
BEGIN
	-- Vérifier que l'utilisateur est MJ
	IF NOT EXISTS (
		SELECT 1 FROM campaign_members
		WHERE user_id = p_user_id AND role = 'dm'
	) THEN
		RAISE EXCEPTION 'Accès refusé : vous devez être MJ';
	END IF;

	-- Trouver le campaign_id à partir du nom de la campagne
	SELECT id INTO v_campaign_id
	FROM campaigns
	WHERE name = p_campaign
	LIMIT 1;

	-- Si pas trouvé par nom, utiliser la campagne du MJ
	IF v_campaign_id IS NULL THEN
		SELECT cm.campaign_id INTO v_campaign_id
		FROM campaign_members cm
		WHERE cm.user_id = p_user_id AND cm.role = 'dm'
		LIMIT 1;
	END IF;

	IF p_id IS NOT NULL THEN
		-- Mise à jour
		UPDATE sessions SET
			number = p_number,
			title = p_title,
			summary = COALESCE(p_summary, ''),
			dm_notes = p_dm_notes,
			date_played = p_date_played,
			xp_awarded = p_xp_awarded,
			visibility = p_visibility,
			attachments = p_attachments,
			campaign_id = v_campaign_id,
			updated_at = now()
		WHERE id = p_id;
	ELSE
		-- Insertion
		INSERT INTO sessions (
			number,
			title,
			summary,
			dm_notes,
			date_played,
			xp_awarded,
			visibility,
			attachments,
			campaign_id
		) VALUES (
			p_number,
			p_title,
			COALESCE(p_summary, ''),
			p_dm_notes,
			p_date_played,
			p_xp_awarded,
			p_visibility,
			p_attachments,
			v_campaign_id
		);
	END IF;
END;
$$;
