-- Permet au joueur propriétaire d'un personnage (ou au MJ) de mettre à jour les stats du personnage

CREATE OR REPLACE FUNCTION player_update_character_stats(
	p_user_id uuid,
	p_char_id uuid,
	p_stats jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
	-- Vérifier que l'utilisateur est propriétaire du personnage ou MJ
	IF NOT EXISTS (
		SELECT 1 FROM characters
		WHERE id = p_char_id
		AND (
			player_id = p_user_id
			OR EXISTS (
				SELECT 1 FROM campaign_members
				WHERE user_id = p_user_id AND role = 'dm'
			)
		)
	) THEN
		RAISE EXCEPTION 'Accès refusé : vous devez être propriétaire du personnage ou MJ';
	END IF;

	UPDATE characters
	SET
		stats = p_stats,
		updated_at = now()
	WHERE id = p_char_id;
END;
$$;
