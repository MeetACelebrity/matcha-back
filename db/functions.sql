CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;


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
        IF number_img >= 4 THEN
            RETURN QUERY SELECT '', '', -1, 'TOO_MANY_PICS';
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
            uuid = $1;

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
            images.uuid= $2
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

CREATE OR REPLACE FUNCTION get_images("user_id_images" int) RETURNS TABLE ("images_list" text[]) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            ARRAY [
                images.uuid::text,
                images.src::text,
                profile_pictures.image_nb::text
            ] as "images_list"
        FROM
            profile_pictures
        INNER JOIN
            images
        ON
            profile_pictures.image_id = images.id
        WHERE
            profile_pictures.user_id = user_id_images;
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

CREATE OR REPLACE FUNCTION get_tags("user_id_tags" int) RETURNS TABLE ("tags_list" text[]) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            ARRAY [
                tags.uuid::text,
                tags.name
            ] as "tags_list"
        FROM
            tags
        INNER JOIN
            users_tags
        ON
            tags.id = users_tags.tag_id
        WHERE
            users_tags.user_id = user_id_tags;
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



-- Chat
CREATE OR REPLACE FUNCTION create_conv("uuid1" uuid, "uuid2" uuid, "conv" uuid) RETURNS boolean AS $$
DECLARE
    user1 record;
    user2 record;
    conv record;

    -- operation_permitted BOOLEAN;
BEGIN
-- Get id of user 1
    SELECT
        id
    INTO
        user1
    FROM
        users
    WHERE
        uuid = $1;

-- Get id of user 2
    SELECT
        id
    INTO
        user2
    FROM
        users
    WHERE
        uuid = $2;

    IF user1.id IS NULL OR user2.id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- If one of the both users has been blocked by the other, exit.

    -- SELECT
    --     COUNT(*) = 0
    -- INTO
    --     operation_permitted
    -- FROM
    --     blocks
    -- WHERE
    --     (blocks.blocker = user1.id AND blocks.blocked = user2.id)
    --         OR
    --     (blocks.blocker = user2.id AND blocks.blocked = user1.id);

    -- IF operation_permitted = FALSE THEN
    --     RETURN FALSE;
    -- END IF;

-- Create conversation
    INSERT INTO
        conversations
    ( uuid )
    VALUES
        ( $3 )
    RETURNING
        id
    INTO
        conv;

    IF conv.id IS NULL THEN
        RETURN FALSE;
    END IF;

-- Register user1 to conv
    INSERT INTO
        conversations_users ( 
            user_id, 
            conversation_id
        )
        VALUES (
            user1.id,
            conv.id
        );
    -- Register user2 to conv
    INSERT INTO
        conversations_users ( 
            user_id, 
            conversation_id
        )
        VALUES (
            user2.id,
            conv.id
        );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_conv("uuid1" uuid, "uuid2" uuid) RETURNS boolean AS $$
    DECLARE
        conv record;
        del record;
    BEGIN
    -- Get id of conv
        SELECT
            conversation_id as "id"
        INTO
            conv
        FROM
            conversations_users
        WHERE
            user_id
        IN (
            ( SELECT id FROM users WHERE uuid = $1 ),
            ( SELECT id FROM users WHERE uuid = $2 )
        )
        AND
            user_id = ( SELECT id FROM users WHERE uuid = $1 );

    -- Delete all messages of the conv
        DELETE FROM
            messages
        WHERE
            conversation_id = conv.id;
    -- Delete all registered
        DELETE FROM
            conversations_users
        WHERE
            conversation_id = conv.id;

    -- Delete the conv
        DELETE FROM
            conversations
        WHERE
            id = conv.id
        RETURNING
            id
        INTO 
            del;

        IF del.id IS NOT NULL THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_message("conv_uuid" uuid, "author_uuid" uuid, "payload" text, "message_uuid" uuid) RETURNS boolean AS $$
    DECLARE
        conv record;
        author_id INTEGER;
        user_id INTEGER;
        checker record;
    BEGIN
    -- Get id of conv
        SELECT
            id
        INTO
            conv
        FROM
            conversations
        WHERE
            uuid = $1;
        
        IF conv.id IS NULL THEN
            RETURN FALSE;
        END IF;

    -- Get id of user
        SELECT
            id
        INTO
            author_id
        FROM
            users
        WHERE
            uuid = $2;
            
        IF author_id IS NULL THEN
            RETURN FALSE;
        END IF;

    -- Check that author is part of the conversation
        SELECT
            conversation_id
        INTO
            checker
        FROM
            conversations_users
        WHERE
            conversations_users.user_id = author_id
        AND
            conversations_users.conversation_id = conv.id;
        
        IF checker.conversation_id IS NULL THEN
            RETURN FALSE;
        END IF;

    -- Create message
        INSERT INTO
            messages( 
                uuid,
                author_id,
                conversation_id,
                payload
            )
            VALUES (
                $4,
                author_id,
                conv.id,
                $3
            );

        -- Set the property `saw_messages` to `FALSE` for all the conversations members except the message author.
        FOR user_id IN
            SELECT
                id
            FROM
                conversations_users
            INNER JOIN
                users
            ON
                conversations_users.user_id = users.id
            WHERE
                conversations_users.conversation_id = conv.id
        LOOP
            IF user_id = author_id THEN
                CONTINUE;
            END IF;

            UPDATE
                users
            SET
                saw_messages = FALSE
            WHERE
                id = user_id;
        END LOOP;

        RETURN TRUE;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_message("message_uuid" uuid, "author_uuid" uuid) RETURNS boolean AS $$
    DECLARE
        user_id record;
        message_id record;
        del record;
    BEGIN
    -- Get id of author
        SELECT
            id
        INTO
            user_id
        FROM
            users
        WHERE
            uuid = $2;

    -- Get id of Message
        SELECT
            id
        INTO
            message_id
        FROM
            messages
        WHERE
            uuid = $1;

    -- Delete message where author is good
        DELETE FROM 
            messages
        WHERE
            id = message_id.id
        AND
            author_id = user_id.id
        RETURNING
            id
        INTO 
            del;

        IF del.id IS NOT NULL THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_convs_users("conv_id" int) RETURNS TABLE ("conv_users_list" text[]) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            ARRAY [
                users.uuid::text,
                users.username::text,
                (
                    SELECT
                        images.src
                    FROM
                        profile_pictures
                    INNER JOIN
                        images
                    ON
                        profile_pictures.image_id = images.id
                    WHERE
                        profile_pictures.image_nb = 0
                    AND
                        profile_pictures.user_id = users.id
                )
            ] as "conv_users_list"
        FROM
            conversations_users
        INNER JOIN
            users
        ON
            conversations_users.user_id = users.id
        WHERE
            conversations_users.conversation_id = $1;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_convs_messages("conv_id" int ) RETURNS TABLE ("conv_messages_list" text[]) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            ARRAY [
               messages.uuid::text,
               ( 
                    SELECT 
                        users.uuid 
                    FROM 
                        users 
                    WHERE 
                        users.id = messages.author_id
                )::text,
                ( 
                    SELECT 
                        users.username 
                    FROM 
                        users 
                    WHERE 
                        users.id = messages.author_id
                )::text,
               messages.payload::text,
               messages.created_at::text
            ] as "conv_messages_list"
        FROM
            messages
        WHERE
            conversation_id = $1;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_convs("user_uuid" uuid) RETURNS TABLE (
    "uuid" uuid,
    "conv_users" text[],
    "conv_messages" text[]
 ) AS $$
    DECLARE
        user_info record;
    BEGIN
    -- Get user id
        SELECT
            id
        INTO
            user_info
        FROM
            users
        WHERE
            users.uuid = $1;

    -- Get conversations
        RETURN QUERY
        SELECT 
            conversations.uuid as "uuid",
            ( 
                SELECT 
                    array_agg("conv_users_list"::text) as "conv_users"  
                FROM 
                    get_convs_users(conversations.id) 
            ) as "conv_users",
            (
                SELECT
                    array_agg("conv_messages_list"::text) as "conv_messages"
                FROM
                    get_convs_messages(conversations.id)
            ) as "conv_messages"
        FROM
            conversations_users
        INNER JOIN
            conversations
        ON
            conversations_users.conversation_id = conversations.id
        WHERE
            conversations_users.user_id = user_info.id;
    END;
$$ LANGUAGE plpgsql;

-- Proposals
CREATE OR REPLACE FUNCTION is_blocked("me_id" int, "user_id" int) RETURNS boolean AS $$
    DECLARE
        is_block record;
    BEGIN
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
            RETURN FALSE;
        END IF;
        RETURN TRUE;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION researched_sex("me_id" int, "user_id" int) RETURNS int AS $$
    DECLARE
        me_info record;
        user_info record;
        is_block record;
        research_orientation sexual_orientation;
        research_gender gender;
    BEGIN

        IF is_blocked($1, $2) = FALSE THEN
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
        IF me_info.gender IS NULL OR 
            user_info.gender IS NULL OR 
            user_info.sexual_orientation IS NULL OR 
            user_info.AGE IS NULL OR
            is_liked(me_id, user_id) = TRUE OR
            is_matched(me_id, user_id) = TRUE OR
            is_not_interested(me_id, user_id) = TRUE
            THEN
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
    RETURN 0;
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

CREATE OR REPLACE FUNCTION proposals("me_uuid" uuid) RETURNS TABLE (
            "size" bigint,
            "uuid" uuid,
            "username" text,
            "givenName" text,
            "familyName" text,
            "age" int,
            "distance" float,
            "commonTags" int,
            "score" int,
            "hasLikedMe" boolean,
            "sexualOrientation" sexual_orientation,
            "gender" gender,
            "tags" text[],
            "images" text[]
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
            count(*) OVER() as "size",
            users.uuid,
            users.username,
            users.given_name as "givenName",
            users.family_name as "familyName",
            researched_sex(me_info.id, users.id) as "age",
            distance(me_info.id, users.id) as "distance",
            common_tags(me_info.id, users.id) as "commonTags",
            users.score,
            is_liker(me_info.id, users.id) as "hasLikedMe",
            (SELECT sexual_orientation FROM extended_profiles WHERE user_id = users.id) as "sexualOrientation",
            (SELECT extended_profiles.gender FROM extended_profiles WHERE user_id = users.id),
            ( 
                SELECT 
                    array_agg("tags_list"::text) as "tags"
                FROM 
                    get_tags(users.id)
            ) as "tags",
             ( 
                SELECT 
                    array_agg("images_list"::text) as "images"
                FROM 
                    get_images(users.id)
            ) as "images"
        FROM
            users
        WHERE
            users.id != me_info.id
        AND
            users.confirmed = TRUE
        AND
            age IS NULL
        ORDER BY
             distance,
            "commonTags" DESC,
            users.score DESC;
    END;
$$ LANGUAGE plpgsql;



-- Search
CREATE OR REPLACE FUNCTION is_arround("lat" float, "long" float, "user_id" int) RETURNS boolean AS $$
    DECLARE
        user_info record;
    BEGIN

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
                    id = $3
            );     
    
    -- Retun Distance
        IF ( SELECT point($2, $1) <@> point(user_info.point[1], user_info.point[0])) < 7 THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION has_same_tags("tags_array" text ARRAY[5], "user_id" int) RETURNS boolean AS $$
    DECLARE
        tag     TEXT;
    BEGIN
        -- If the `tags_array` parameter is empty, return false
        IF CARDINALITY(tags_array) = 0 THEN
            RETURN FALSE;
        END IF;

        FOREACH tag IN ARRAY tags_array LOOP
            PERFORM
                tags.id
            FROM
                users_tags
            INNER JOIN
                tags
            ON
                users_tags.tag_id = tags.id
            WHERE
                users_tags.user_id = $2
                    AND
                tags.tsvector @@ PLAINTO_TSQUERY('english', tag);

            IF NOT FOUND THEN
                RETURN FALSE;
            END IF;
        END LOOP;
        RETURN TRUE;
    END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION search("me_uuid" uuid, "me_data" text, "lat" float, "long" float, "tags_array" text ARRAY[5]) RETURNS TABLE (
            "size" bigint,
            "uuid" uuid,
            "username" text,
            "givenName" text,
            "familyName" text,
            "age" int,
            "distance" float,
            "commonTags" int,
            "score" int,
            "hasLikedMe" boolean,
            "sexualOrientation" sexual_orientation,
            "gender" gender,
            "tags" text[],
            "images" text[]
            ) AS $$
    DECLARE
        me_info record;
        location_query text;
        tags_query text;
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

    -- Generate location query
    IF lat IS NOT NULL AND long IS NOT NULL THEN
        location_query := 'AND is_arround($3, $4, users.id) = TRUE';
    ELSE
        location_query := '';
    END IF;

    -- Generate tags query
        IF tags_array IS NOT NULL THEN
            tags_query := 'AND has_same_tags($5, users.id) = TRUE';
        ELSE
            tags_query := '';
        END IF;

    -- Get proposals
        RETURN QUERY
        EXECUTE format('
        SELECT
            count(*) OVER() as "size",
            users.uuid,
            users.username,
            users.given_name as "givenName",
            users.family_name as "familyName", 
            (
                SELECT 
                    EXTRACT(year FROM AGE(extended_profiles.birthday))
                FROM
                    extended_profiles
                WHERE
                   extended_profiles.user_id = users.id 
            )::integer  as "age",
            distance($2, users.id) as "distance",
            common_tags($2, users.id) as "commonTags",
            users.score,
            is_liker($2, users.id) as "hasLikedMe",
            (SELECT sexual_orientation FROM extended_profiles WHERE user_id = users.id) as "sexualOrientation",
            (SELECT extended_profiles.gender FROM extended_profiles WHERE user_id = users.id),
            ( 
                SELECT 
                    array_agg("tags_list"::text) as "tags"
                FROM 
                    get_tags(users.id)
            ) as "tags",
             ( 
                SELECT 
                    array_agg("images_list"::text) as "images"
                FROM 
                    get_images(users.id)
            ) as "images"
        FROM
            users
        WHERE
            users.id != $2
        AND
            is_blocked($2, users.id) = TRUE
        AND
            users.confirmed = TRUE
        AND
        (
                users.username ILIKE $1 || %L
            OR
                users.given_name ILIKE $1 || %L
            OR
                users.family_name ILIKE $1 || %L
        )
        %s
        %s
        ORDER BY
            distance,
            "commonTags" DESC,
            users.score DESC
        ', '%', '%', '%', location_query, tags_query)
        USING me_data, me_info.id, lat, long, tags_array;
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

CREATE OR REPLACE FUNCTION is_liker("me_id" int, "user_id" int) RETURNS boolean AS $$
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
            liker = $2
        AND
            liked = $1;
        
        IF liked_person IS NOT NULL
        THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
     END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION like_status("me_id" int, "user_id" int) RETURNS like_status AS $$
    DECLARE
        is_liked boolean;
        is_liker boolean;
    BEGIN
        is_liked := is_liked(me_id, user_id);
        is_liker := is_liker(me_id, user_id);

        IF is_liked = TRUE AND is_liker = TRUE  THEN
            RETURN 'MATCH';
        ELSIF is_liked = TRUE AND is_liker = FALSE THEN
            RETURN 'LIKED_IT';
        ELSIF is_liked = FALSE AND is_liker = TRUE THEN
            RETURN 'HAS_LIKED_US';
        ELSE
            RETURN 'VIRGIN';  
        END IF;  
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_matched("me_id" int, "user_id" int) RETURNS boolean AS $$
    BEGIN
    -- Check if match
        IF is_liker(me_id, user_id) = TRUE AND is_liked(me_id, user_id) = TRUE
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

CREATE OR REPLACE FUNCTION prepare_filter_query("input" text, "min_value" int, "max_value" int) RETURNS text AS $$
    DECLARE
        filter_query text;
    BEGIN
        IF min_value IS NOT NULL
        THEN
            filter_query := '"' || input || '" >= ' || min_value || ' ';
        END IF;

        IF min_value IS NOT NULL AND max_value IS NOT NULL
        THEN
            filter_query := filter_query || ' AND ' || ' "' || input || '" <= ' || max_value || ' ';
        ELSIF max_value IS NOT NULL
        THEN
            filter_query := '"' || input || '" <= ' || max_value || ' ';
        END IF;

        RETURN filter_query;
    END;
$$ LANGUAGE plpgsql;



-- Format
CREATE OR REPLACE FUNCTION formated("me_uuid" uuid, "me_limit" int, "me_offset" int, "me_order_by" text, "me_order" text, "filter_var" int ARRAY[8], "kind" text, "me_data" text, "lat" float, "long" float, "tags_array" text ARRAY[5]) RETURNS TABLE (
            "total_entries_count" bigint,
            "size" bigint,
            "uuid" uuid, 
            "username" text,
            "givenName" text, 
            "familyName" text,
            "age" int,
            "distance" float,
            "commonTags" int,
            "score" int,
            "likeStatus" like_status,
            "sexualOrientation" sexual_orientation,
            "gender" gender,
            "tags" text[],
            "images" text[]
            ) AS $$
    DECLARE
        i int;
        filter_array text ARRAY[4];
        order_query text;
        final_query text;
        filter_query text;  
        kind_query text;
    BEGIN
        -- Prepare order query
        IF me_order_by IS NOT NULL AND me_order IS NOT NULL 
        THEN
            order_query := 'ORDER BY "' || me_order_by || '" ' || me_order;
        ELSE
            order_query := '';
        END IF;

        -- Prepare filter query
        i := 1;
        filter_array := ARRAY['age', 'distance', 'score', 'commonTags'];
        WHILE i < 5 LOOP

            filter_query :=  prepare_filter_query(filter_array[i], filter_var[ i * 2 - 1], filter_var[ i * 2]);

            IF filter_query IS NOT NULL AND final_query IS NOT NULL THEN
                final_query := final_query || ' AND ' || filter_query; 
            ELSIF filter_query IS NOT NULL THEN
                final_query := filter_query;
            END IF;

            i := i + 1;
        END LOOP;

        IF final_query IS NOT NULL THEN
            final_query := ' WHERE ' || final_query;
        END IF;
    

        IF order_query IS NOT NULL AND order_query != '' AND final_query IS NOT NULL THEN
            final_query := final_query || ' ' || order_query ;
        ELSIF order_query IS NOT NULL AND order_query != '' THEN
            final_query := order_query;
        END IF;

        IF kind = 'proposals' THEN
            kind_query := 'proposals($1)';
        ELSIF kind = 'search' AND me_data IS NOT NULL THEN
            kind_query := 'search($1, $4, $5, $6, $7)';
        END IF;

        RETURN QUERY 
            EXECUTE format('
                SELECT
                    COUNT(*) OVER() AS "total_entries_count",
                    "size",
                    "uuid", 
                    "username",
                    "givenName", 
                    "familyName",
                    "age",
                    "distance",
                    "commonTags",
                    "score",
                    like_status( (SELECT id FROM users WHERE uuid = $1), (SELECT id FROM users WHERE uuid = %s.uuid)) as "likeStatus",
                    "sexualOrientation",
                    "gender",
                    "tags",
                    "images"
                FROM
                    %s
                %s
                LIMIT
                    $2
                OFFSET
                    $3
                ', kind, kind_query, final_query)
            USING me_uuid, me_limit, me_offset, me_data, lat, long, tags_array;
             END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION block_user(blocker UUID, blocked UUID) RETURNS BOOLEAN AS $$
DECLARE
    conversations_id    INTEGER[];
BEGIN
    -- Delete the conversation and the messages they had or do nothing.
    conversations_id := ARRAY(
        SELECT
            conversations_users.conversation_id
        FROM
            conversations_users
        INNER JOIN
            users
        ON
            conversations_users.user_id = users.id
        WHERE
            users.uuid IN (blocker, blocked)
    );

    DELETE FROM
        messages
    WHERE
        conversation_id = ANY(conversations_id);

    DELETE FROM
        conversations_users
    WHERE
        conversation_id = ANY(conversations_id);

    DELETE FROM
        conversations
    WHERE
        id = ANY(conversations_id);

    WITH 
        blocker_id
    AS (
        SELECT
            id
        FROM
            users
        WHERE
            uuid = blocker
    ),
        blocked_id
    AS (
        SELECT
            id
        FROM
            users
        WHERE
            uuid = blocked
    )
    INSERT INTO
        blocks
    (
        blocker,
        blocked
    )
    VALUES
    (
        (SELECT id FROM blocker_id),
        (SELECT id FROM blocked_id)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
