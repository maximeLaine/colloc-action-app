-- Migration : suivi des ressources de personnage
-- À exécuter dans le dashboard Supabase > SQL Editor

-- 1. Ajouter la colonne resources à la table characters
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS resources jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. RPC : un joueur met à jour les ressources de son propre personnage
CREATE OR REPLACE FUNCTION player_update_resources(
  p_user_id  uuid,
  p_char_id  uuid,
  p_resources jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE characters
  SET resources  = p_resources,
      updated_at = now()
  WHERE id        = p_char_id
    AND player_id = p_user_id;
END;
$$;
