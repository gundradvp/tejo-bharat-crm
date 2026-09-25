/*
# Fix: handle no-space search like "VeniGundra" by checking if name tokens
# appear as substrings of the search string
*/

CREATE OR REPLACE FUNCTION public.fuzzy_name_match(p_name TEXT, p_search TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_name TEXT;
  v_search TEXT;
  v_name_nospace TEXT;
  v_search_nospace TEXT;
  v_search_tokens TEXT[];
  v_name_tokens TEXT[];
  v_token TEXT;
  v_all_match BOOLEAN;
  v_name_token TEXT;
  v_match_count INT := 0;
BEGIN
  IF p_search IS NULL OR trim(p_search) = '' THEN
    RETURN TRUE;
  END IF;
  IF p_name IS NULL THEN
    RETURN FALSE;
  END IF;

  v_name := lower(trim(p_name));
  v_search := lower(trim(p_search));
  v_name_nospace := replace(v_name, ' ', '');
  v_search_nospace := replace(v_search, ' ', '');

  -- 1. Case-insensitive substring match
  IF position(v_search in v_name) > 0 THEN
    RETURN TRUE;
  END IF;

  -- 2. Space-insensitive match
  IF position(v_search_nospace in v_name_nospace) > 0 THEN
    RETURN TRUE;
  END IF;

  -- 3. All search tokens appear as substrings in name (any order)
  v_search_tokens := regexp_split_to_array(v_search, '\s+');
  v_all_match := TRUE;
  FOREACH v_token IN ARRAY v_search_tokens LOOP
    IF v_token = '' THEN CONTINUE; END IF;
    IF position(v_token in v_name) = 0 THEN
      v_all_match := FALSE;
      EXIT;
    END IF;
  END LOOP;
  IF v_all_match AND array_length(v_search_tokens, 1) > 0 THEN
    RETURN TRUE;
  END IF;

  -- 4. Reverse token check: name tokens appear in search (handles "VeniGundra")
  --    At least 2 name tokens must be found, or all if name has < 3 tokens
  v_name_tokens := regexp_split_to_array(v_name, '\s+');
  v_match_count := 0;
  FOREACH v_name_token IN ARRAY v_name_tokens LOOP
    IF v_name_token = '' THEN CONTINUE; END IF;
    IF length(v_name_token) >= 3 AND position(v_name_token in v_search_nospace) > 0 THEN
      v_match_count := v_match_count + 1;
    END IF;
  END LOOP;
  IF v_match_count >= 2 AND v_match_count >= ceil(array_length(v_name_tokens, 1) / 2.0) THEN
    RETURN TRUE;
  END IF;

  -- 5. Trigram similarity for typo tolerance
  IF similarity(v_name_nospace, v_search_nospace) > 0.3 THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fuzzy_name_match(TEXT, TEXT) TO authenticated;
