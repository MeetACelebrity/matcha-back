CREATE OR REPLACE FUNCTION upsert_profile_picture(uuid1 uuid, new_pics text, uuid2 uuid) RETURNS text AS $$
DECLARE
    id_user users%ROWTYPE;
    new_image images%ROWTYPE;
    old_image record;
BEGIN
    -- Get id of user in id_user
    SELECT
        id
    INTO
        id_user
    FROM
        users
    WHERE
        uuid=$1;

     -- Insert the new image on images table
    INSERT INTO
        images 
        (
            uuid,
            path
        )
    VALUES
        (
            $3,
            $2
        )
    RETURNING
        id
    INTO
        new_image;

    BEGIN
        INSERT INTO
        profile_pictures
        (
            image_id,
            user_id,
            image_nb
        )
        VALUES
        (
            new_image.id,
            id_user.id,
            0
        );
    EXCEPTION WHEN unique_violation THEN
    -- When user have already a profile picture
        -- Get id of the old
        SELECT 
            profile_pictures.image_id, 
            images.path
        INTO
            old_image
        FROM 
            profile_pictures
        INNER JOIN
            images
        ON 
            profile_pictures.image_id = images.id
        WHERE 
            user_id=id_user.id
        AND 
            image_nb=0;
        
        -- Link user_id and image_id (of the new) in profile_picture
        UPDATE
            profile_pictures
        SET
            image_id=new_image.id
        WHERE
            user_id=id_user.id
        AND
            image_nb=0;
        
        -- And delete his old pics in images table
        DELETE FROM
            images
        WHERE
            id=old_image.image_id;
        RETURN old_image.path;
    END;
    RETURN 'DONE';
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION insert_picture(uuid1 uuid, new_pics text, uuid2 uuid) RETURNS text AS $$
DECLARE
    id_user users%ROWTYPE;
    new_image images%ROWTYPE;
    number_img integer;
BEGIN
 -- Get id of user in id_user
    SELECT
        id
    INTO
        id_user
    FROM
        users
    WHERE
        uuid=$1;

-- Get number image of user has AND check number
    SELECT
        count(image_nb)
    INTO
        number_img
    FROM
        profile_pictures
    WHERE
        user_id=id_user.id
    AND
        image_nb != 0;

    IF number_img > 4 THEN
        RETURN 'TOO_MANY_PICS';
    END IF;

-- Insert image in images tables
    INSERT INTO
        images 
        (
            uuid,
            path
        )
    VALUES
        (
            $3,
            $2
        )
    RETURNING
        id
    INTO
        new_image;

-- Link user_id, image_id, and set image_nb
    INSERT INTO
        profile_pictures
        (
            image_id,
            user_id,
            image_nb
        )
    VALUES
        (
            new_image.id,
            id_user.id,
            number_img + 1
        );

    RETURN 'DONE';
END;
$$ LANGUAGE plpgsql;