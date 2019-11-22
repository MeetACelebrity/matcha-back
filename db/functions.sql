-- Pictures 
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
                src
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
                images.src
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
            RETURN old_image.src;
        END;
        RETURN 'DONE';
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insert_picture(uuid1 uuid, new_pics text, uuid2 uuid) RETURNS TABLE ("uuid" uuid, "src" text, "imageNumber" int, "error" text) AS $$
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
        users.uuid=$1;

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
            RETURN QUERY SELECT '', '', '', 'TOO_MANY_PICS';
        END IF;

    -- Insert image in images tables
        INSERT INTO
            images 
            (
                uuid,
                src
            )
        VALUES
            (
                $3,
                $2
            )
        RETURNING
            images.id, images.uuid, images.src
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

        RETURN QUERY SELECT new_image.uuid, new_image.src, number_img + 1, 'DONE';
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_picture(uuid1 uuid, uuid2 uuid) RETURNS text AS $$
    DECLARE
        id_user users%ROWTYPE;
        current_image record;
        pp_row profile_pictures%ROWTYPE;
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

    -- Get id of image in current_images
        SELECT
            *
        INTO
            current_image
        FROM
            profile_pictures
        INNER JOIN
            images
        ON
            profile_pictures.image_id=images.id
        WHERE
            images.uuid=$2
        AND
            profile_pictures.user_id=id_user.id
        AND
            profile_pictures.image_nb != 0;        

    -- Is image is wright 
        IF current_image.id IS NULL
        THEN
            RETURN 'BAD_IMAGE';
        END IF;

    -- Delete image from profile_picture
        DELETE FROM
            profile_pictures
        WHERE
            image_id=current_image.id
        AND
            user_id=id_user.id;
    -- Delete image frmom images
        DELETE FROM
            images
        WHERE
            uuid=current_image.uuid;

    -- Update image_nb of concerned images
        FOR pp_row IN 
                    SELECT 
                        * 
                    FROM 
                        profile_pictures
                    WHERE
                        user_id=id_user.id
                    AND
                        image_nb!=0
                    AND
                        image_nb > current_image.image_nb
            LOOP
            UPDATE
                profile_pictures
            SET
                image_nb=image_nb - 1
            WHERE id = pp_row.id;
        END LOOP;
        RETURN current_image.src;
    END;
$$ LANGUAGE plpgsql;


-- Tags
CREATE OR REPLACE FUNCTION upsert_tag("uuid" uuid, "token" uuid, "tag" text) RETURNS text AS $$
    DECLARE
        id_user record;
        id_tag record;
    BEGIN
    -- Get id of user in id_user
        SELECT
            id
        INTO
            id_user
        FROM
            users
        WHERE
            users.uuid=$1;

    -- Upsert tags and get id
        BEGIN
            INSERT INTO
                tags (
                    uuid, 
                    name,
                    tsvector
                )
            VALUES
                (
                    $2, 
                    $3,
                    to_tsvector($3)
                )
            RETURNING
                tags.id
            INTO
                id_tag;
        RAISE NOTICE 'id_tag: %', id_tag;
            EXCEPTION WHEN unique_violation THEN
            SELECT 
                id
            INTO
                id_tag 
            FROM 
                tags
            WHERE
                tags.name = $3;
        END;
    
    -- Insert tags in users_tags
        BEGIN
            INSERT INTO
                users_tags (
                    tag_id,
                    user_id
                )
            VALUES
            (
                id_tag.id,
                id_user.id
            );
            EXCEPTION WHEN unique_violation THEN
            RETURN 'TAGS ALREADY OWNED';
        END;
        RETURN 'DONE';
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_tag("uuid" uuid, "tag" text) RETURNS text AS $$
    DECLARE
        id_user record;
        id_tag record;
    BEGIN
    -- Get id of user in id_user
        SELECT
            id
        INTO
            id_user
        FROM
            users
        WHERE
            users.uuid=$1;
    
    -- Get id of tag
        SELECT
            id
        INTO
            id_tag
        FROM
            tags
        WHERE
            tags.name = $2;
    
    -- Check ids
        IF id_user.id IS NULL OR id_tag.id IS NULL
        THEN
            RETURN 'BAD TAG';
        END IF;
 
    -- DELETE tag user link
        DELETE FROM
            users_tags
        WHERE
            users_tags.tag_id = id_tag.id
        AND
            users_tags.user_id = id_user.id;
    -- if no user register to the tag, delete it from tags table 
        IF NOT EXISTS (SELECT * FROM users_tags WHERE users_tags.tag_id = id_tag.id)
        THEN
            DELETE FROM tags WHERE tags.id = id_tag.id;
        END IF;
        RETURN 'DONE';
    END;
$$ LANGUAGE plpgsql;


-- Addresses
CREATE OR REPLACE FUNCTION upsert_addresses("uuid" uuid, "is_primary" boolean, "lat"  double precision, "long"  double precision, "name" text, "administrative" text, "county" text, "country" text, "city" text) RETURNS text AS $$
    DECLARE
        id_user record;
        id_addresses addresses%ROWTYPE;
        address_field text;
        address_type address_type;
    BEGIN
    -- Determin the address_field that we need to use
        IF is_primary THEN
            address_field := 'primary_address_id';
            address_type := 'PRIMARY';
        ELSE
            address_field := 'current_address_id';
            address_type := 'CURRENT';
        END IF;

    -- Get user id and address_field id
        EXECUTE format('
            SELECT
                id,
                %I as "address_field"
            FROM
                users
            WHERE
                users.uuid = %L', address_field, uuid)
        INTO
            id_user;
    -- Set upsert: if address_field is no null update, else insert
    
        IF id_user.address_field IS NOT NULL THEN
            UPDATE
                addresses 
            SET
                point = POINT($3 ,$4),
                name = $5,
                administrative = $6,
                county = $7,
                country = $8,
                city = $9
            WHERE
                id_user.address_field = addresses.id;
        ELSE
            EXECUTE format('
                INSERT INTO
                    addresses 
                (   
                    point, 
                    name, 
                    administrative, 
                    county, 
                    country, 
                    city,
                    type
                )
                VALUES 
                (
                    POINT(%L, %L),
                    %L,
                    %L,
                    %L,
                    %L,
                    %L,
                    %L
                )
                RETURNING
                    id ',
                    lat,
                    long,
                    name,
                    administrative,
                    county,
                    country,
                    city,
                    address_type
            )
            INTO
                id_addresses;
            
            EXECUTE format('UPDATE  
                users
            SET
                %I = %L
            WHERE
                users.id = %L', address_field, id_addresses.id, id_user.id);
        END IF;

        RETURN 'DONE';
    END;
$$ LANGUAGE plpgsql;



-- Proposals
CREATE OR REPLACE FUNCTION researched_sex("me_id" int, "user_id" int) RETURNS int AS $$
    DECLARE
        me_info record;
        user_info record;
        is_block record;
        research_orientation sexual_orientation;
        research_gender gender;
    BEGIN
    
    -- Ckeck if user block each other
        SELECT 
            *
        INTO
            is_block
        FROM
            blocks
        WHERE (
                blocker = $1
            AND
                blocked = $2
        )
        OR (
                blocker = $2
            AND
                blocked = $1
        );

        IF is_block IS NOT NULL THEN
            RETURN 0;
        END IF;


    -- Get gender, sexual_orientation, age of logged user in 'me'
        SELECT
            gender,
            sexual_orientation
        INTO
            me_info
        FROM
            extended_profiles
        WHERE
            extended_profiles.user_id = $1;

 
    -- Get gender, sexual_orientation, age of logged user in 'me'
        SELECT
            gender,
            sexual_orientation,
            EXTRACT(year FROM AGE(extended_profiles.birthday)) as AGE
        INTO
            user_info
        FROM
            extended_profiles
        WHERE
            extended_profiles.user_id = $2;

    -- Check if user match (if its the case return age, else return 0)
        IF me_info.gender IS NULL OR user_info.gender IS NULL OR user_info.sexual_orientation IS NULL OR user_info.AGE IS NULL THEN
            RETURN 0;
        END IF;
    
    CASE me_info.sexual_orientation
        WHEN 'HETEROSEXUAL' THEN
            IF user_info.gender = inv_gender(me_info.gender) AND (user_info.sexual_orientation = 'HETEROSEXUAL' OR user_info.sexual_orientation = 'BISEXUAL')
            THEN
                RETURN user_info.AGE;
            END IF;
        WHEN 'HOMOSEXUAL' THEN
            IF user_info.gender = me_info.gender AND (user_info.sexual_orientation = 'HOMOSEXUAL' OR user_info.sexual_orientation = 'BISEXUAL')
            THEN
                RETURN user_info.AGE;
            END IF;
        WHEN 'BISEXUAL' THEN
            IF (user_info.gender = inv_gender(me_info.gender) AND user_info.sexual_orientation = 'HETEROSEXUAL') OR (user_info.gender = me_info.gender AND user_info.sexual_orientation = 'HOMOSEXUAL') OR user_info.sexual_orientation = 'BISEXUAL'
            THEN
                RETURN user_info.AGE;
            END IF;
    END CASE;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION distance("me_id" int, "user_id" int) RETURNS float AS $$
    DECLARE
        me_info record;
        user_info record;
    BEGIN
    
    -- Get position of loggued user
        SELECT
            addresses.point
        INTO
            me_info
        FROM
            addresses
        WHERE
            id = (
                SELECT
                    (
                        CASE WHEN 
                            (current_address_id IS NULL)
                        THEN
                            primary_address_id
                        ELSE
                            current_address_id
                        END
                    )
                FROM
                    users
                WHERE
                    id = $1
            );        

    -- Get position of user
        SELECT
            addresses.point
        INTO
            user_info
        FROM
            addresses
        WHERE
            id = (
                SELECT
                    (
                        CASE WHEN 
                            (current_address_id IS NULL)
                        THEN
                            primary_address_id
                        ELSE
                            current_address_id
                        END
                    )
                FROM
                    users
                WHERE
                    id = $2
            );     
    
    -- Retun Distance

    RETURN ( SELECT
                point(me_info.point[1], me_info.point[0])
                <@>
                point(user_info.point[1], user_info.point[0])
            );

    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION common_tags("me_id" int, "user_id" int) RETURNS int AS $$
    BEGIN
    DROP TABLE IF EXISTS me_info_table;
    DROP TABLE IF EXISTS user_info_table;
    DROP TABLE IF EXISTS common_tag;
    -- Get tags of loggued user
    CREATE TEMP TABLE me_info_table ON COMMIT DROP AS
        SELECT
            strip(tsvector) as tsvector,
            count(strip(tsvector))
        FROM 
            tags
        INNER JOIN
            users_tags
        ON
            users_tags.tag_id = tags.id
        WHERE
             users_tags.user_id = $1
        GROUP BY
            strip(tsvector);

    -- Get tags of user
     CREATE TEMP TABLE user_info_table ON COMMIT DROP AS
        SELECT
            strip(tsvector) as tsvector,
            count(strip(tsvector))
        FROM 
            tags
        INNER JOIN
            users_tags
        ON
            users_tags.tag_id = tags.id
        WHERE
             users_tags.user_id = $2
        GROUP BY
            strip(tsvector);

    -- Get common tags of tow user
    CREATE TEMP TABLE common_tag ON COMMIT DROP AS
        WITH 
            unified AS (
                SELECT
                    tsvector
                FROM
                    me_info_table
                UNION ALL
                SELECT
                    tsvector
                FROM
                    user_info_table
            )
        SELECT
            strip(tsvector),
            count(*)
        FROM
            unified
        GROUP BY
            strip
        HAVING
            count(*) > 1;

        RETURN (select count(*) from common_tag);
    END;
$$ LANGUAGE plpgsql;


-- Utils 
CREATE OR REPLACE FUNCTION inv_gender("gender" gender) RETURNS gender AS $$
    BEGIN
        IF $1 = 'MALE' THEN
            RETURN 'FEMALE';
        ELSE
            RETURN 'MALE';
        END IF;
    END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION is_liked("me_id" int, "user_id" int) RETURNS boolean AS $$
    DECLARE
        liked_person record;
    BEGIN
        SELECT
            *
        INTO
            liked_person
        FROM
            likes
        WHERE
            liker = $1
        AND
            liked = $2;
        
        IF liked_person IS NOT NULL
        THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
     END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_matched("me_id" int, "user_id" int) RETURNS boolean AS $$
    DECLARE
        liker_person record;
    BEGIN
    -- Check if he liked us
        SELECT
            *
        INTO
            liker_person
        FROM
            likes
        WHERE
            liker = $2
        AND
            liked = $1;

    -- Check if match
        IF liker_person IS NOT NULL AND is_liked(me_id, user_id) = TRUE
        THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION is_not_interested("me_id" int, "user_id" int) RETURNS boolean AS $$
    DECLARE
        not_interested_person record;
    BEGIN
        SELECT
            *
        INTO
            not_interested_person
        FROM
            not_interested
        WHERE
            actor = $1
        AND
            target = $2;
        IF not_interested_person IS NOT NULL
        THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION proposals("me_uuid" uuid) RETURNS TABLE (
            "uuid" uuid, 
            "username" text,
            "givenNaqme" text, 
            "familyName" text,
            "distance" float,
            "commonTags" int,
            "score" int
            ) AS $$
    DECLARE
        me_info record;
    BEGIN
    -- Get current users
        SELECT
            *
        INTO
            me_info
        FROM
            users
        WHERE
            users.uuid = $1;
    -- Get proposals
        RETURN QUERY
        SELECT
            users.uuid,
            users.username,
            users.given_name as "givenName",
            users.family_name as "familyName",
            distance(1, users.id) as "distance",
            common_tags(1, users.id) as "commonTags",
            users.score
        FROM
            users
        WHERE
            users.id != 1
        AND
            users.confirmed = TRUE
        AND
            researched_sex(1, users.id) > 0
        ORDER BY
            distance,
            "commonTags",
            score;

    END;
$$ LANGUAGE plpgsql;