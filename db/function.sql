CREATE FUNCTION insert_tag(id_user integer, tag_name text, token text) AS $$
        WITH
            id_tag
        AS
        (
            INSERT INTO
                tags
                (
                    uuid,
                    name
                )
            VALUES
                (
                    $3,
                    $2
                )
            ON CONFLICT
                (
                    name
                )
            DO 
                UPDATE 
                SET 
                    name=EXCLUDED.name 
            RETURNING id

        )
        INSERT INTO
            users_tags
            (
                user_id,
                tag_id
            )
        SELECT 
            $1,
            id_tag.id
        FROM
            id_tag;
$$ LANGUAGE SQL;