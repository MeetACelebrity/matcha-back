import { ModelArgs } from './index';
import { Tags, Image, srcToPath } from './user';

export enum Order {
    'ASC',
    'DES',
}

export enum OrderBy {
    'age',
    'distance',
    'score',
    'commonTags',
}

export interface ProposalArgs extends ModelArgs {
    uuid: string;
    limit: number;
    offset: number;
    orderBy: OrderBy;
    order: Order;
    minAge: number;
    maxAge: number | null;
    minDistance: number;
    maxDistance: number | null;
    minScore: number;
    maxScore: number | null;
    minCommonTags: number;
    maxCommonTags: number | null;
}

export interface SearchArgs extends ProposalArgs {
    data: string;
    lat: number | null;
    long: number | null;
    tagsArray: string[] | null;
}

export interface CardUser {
    uuid: string;
    username: string;
    givenName: string;
    familyName: string;
    age: number;
    distance: number;
    commonTags: number;
    score: number;
    likeStatus: string;
    tags: Tags[];
    images: Image[];
}

export interface GetIntervals extends ModelArgs {
    uuid: string;
}

export async function getIntervals({
    db,
    uuid,
}: GetIntervals): Promise<{
    minAge: number;
    maxAge: number;
    minScore: number;
    maxScore: number;
    minDistance: number;
    maxDistance: number;
    minCommonTags: number;
    maxCommonTags: number;
} | null> {
    // GET min, max Score | min, max Age, | min, max Tags | min, max Distance beetwen us
    const query = `
        WITH
            id_user
        AS (
            SELECT
                *
            FROM
                users
            WHERE
                uuid = $1
        )
        SELECT
            MIN(score) as "minScore",
            MAX(score) as "maxScore",
            MIN( EXTRACT(year FROM AGE(extended_profiles.birthday)) ) as "minAge",
            MAX( EXTRACT(year FROM AGE(extended_profiles.birthday)) ) as "maxAge",
            MIN(distance((SELECT id FROM id_user), users.id)) as "minDistance",
            MAX(distance((SELECT id FROM id_user), users.id)) as "maxDistance",
            MIN(common_tags((SELECT id FROM id_user), users.id)) as "minCommonTags",
            MAX(common_tags((SELECT id FROM id_user), users.id)) as "maxCommonTags"
        FROM
            users
        INNER JOIN
            extended_profiles
        ON
            users.id = extended_profiles.user_id;
        `;

    try {
        const {
            rows: [intervals],
        } = await db.query(query, [uuid]);
        return { ...intervals };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function proposals({
    db,
    uuid,
    limit,
    offset,
    orderBy,
    order,
    minAge,
    maxAge,
    minDistance,
    maxDistance,
    minScore,
    maxScore,
    minCommonTags,
    maxCommonTags,
}: ProposalArgs): Promise<{ data: CardUser[]; hasMore: boolean } | null> {
    try {
        const query = `
            SELECT
                *
            FROM
                formated($1, $2, $3, $4, $5, ARRAY[$6, $7, $8, $9, $10, $11, $12, $13]::integer[], $14, NULL, NULL, NULL, NULL)
            `;

        // checking number:
        if (
            isNaN(limit) ||
            isNaN(offset) ||
            isNaN(minAge) ||
            isNaN(minDistance) ||
            isNaN(minScore) ||
            isNaN(minCommonTags) ||
            (maxAge !== null && isNaN(maxAge)) ||
            (maxDistance !== null && isNaN(maxDistance)) ||
            (maxScore !== null && isNaN(maxScore)) ||
            (maxCommonTags !== null && isNaN(maxCommonTags))
        ) {
            return null;
        }

        const {
            rows: users,
            rows: [{ total_entries_count } = { total_entries_count: 0 }],
        } = await db.query(query, [
            uuid,
            limit,
            offset,
            orderBy,
            order,
            minAge,
            maxAge,
            minDistance,
            maxDistance,
            minScore,
            maxScore,
            minCommonTags,
            maxCommonTags,
            'proposals',
        ]);

        // check result and well format output(get the size, remove it from data), the send it
        const hasMore = total_entries_count > offset + limit;

        const data = users.map(
            ({
                uuid,
                username,
                givenName,
                familyName,
                age,
                distance,
                commonTags,
                score,
                likeStatus,
                sexualOrientation,
                gender,
                tags,
                images,
            }) => ({
                uuid,
                username,
                givenName,
                familyName,
                age,
                distance,
                commonTags,
                score,
                likeStatus,
                sexualOrientation,
                gender,
                tags:
                    tags !== null
                        ? tags.map((tag: string) => ({
                              uuid: tag
                                  .slice(1, -1)
                                  .split(',')[0]
                                  .replace(/['"]+/g, ''),
                              text: tag
                                  .slice(1, -1)
                                  .split(',')[1]
                                  .replace(/['"]+/g, ''),
                          }))
                        : null,
                images:
                    images !== null
                        ? images.map((image: string) => ({
                              uuid: image.slice(1, -1).split(',')[0],
                              src: srcToPath(image.slice(1, -1).split(',')[1]),
                              imageNumber: image.slice(1, -1).split(',')[2],
                          }))
                        : null,
            })
        );
        return { data, hasMore };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function search({
    db,
    uuid,
    data,
    limit,
    offset,
    lat,
    long,
    tagsArray,
    orderBy,
    order,
    minAge,
    maxAge,
    minDistance,
    maxDistance,
    minScore,
    maxScore,
    minCommonTags,
    maxCommonTags,
}: SearchArgs): Promise<{ datas: CardUser[]; hasMore: boolean } | null> {
    try {
        const query = `
            SELECT
                *
            FROM
                formated($1, $2, $3, $4, $5, ARRAY[$6, $7, $8, $9, $10, $11, $12, $13]::integer[], $14, $15, $16, $17, $18)
            `;

        // checking number:
        if (
            isNaN(limit) ||
            isNaN(offset) ||
            isNaN(minAge) ||
            isNaN(minDistance) ||
            isNaN(minScore) ||
            isNaN(minCommonTags) ||
            (lat !== null && isNaN(lat)) ||
            (long !== null && isNaN(long)) ||
            (maxAge !== null && isNaN(maxAge)) ||
            (maxDistance !== null && isNaN(maxDistance)) ||
            (maxScore !== null && isNaN(maxScore)) ||
            (maxCommonTags !== null && isNaN(maxCommonTags))
        ) {
            return null;
        }

        const {
            rows: users,
            rows: [{ total_entries_count } = { total_entries_count: 0 }],
        } = await db.query(query, [
            uuid,
            limit,
            offset,
            orderBy,
            order,
            minAge,
            maxAge,
            minDistance,
            maxDistance,
            minScore,
            maxScore,
            minCommonTags,
            maxCommonTags,
            'search',
            data,
            lat,
            long,
            tagsArray,
        ]);

        // check result and well format output(get the size, remove it from data), the send it
        const hasMore = total_entries_count > offset + limit;

        const datas = users.map(
            ({
                uuid,
                username,
                givenName,
                familyName,
                age,
                distance,
                commonTags,
                score,
                likeStatus,
                sexualOrientation,
                gender,
                tags,
                images,
            }) => ({
                uuid,
                username,
                givenName,
                familyName,
                age,
                distance,
                commonTags,
                score,
                likeStatus,
                sexualOrientation,
                gender,
                tags:
                    tags !== null
                        ? tags.map((tag: string) => ({
                              uuid: tag
                                  .slice(1, -1)
                                  .split(',')[0]
                                  .replace(/['"]+/g, ''),
                              text: tag
                                  .slice(1, -1)
                                  .split(',')[1]
                                  .replace(/['"]+/g, ''),
                          }))
                        : null,
                images:
                    images !== null
                        ? images.map((image: string) => ({
                              uuid: image.slice(1, -1).split(',')[0],
                              src: srcToPath(image.slice(1, -1).split(',')[1]),
                              imageNumber: image.slice(1, -1).split(',')[2],
                          }))
                        : null,
            })
        );
        return { datas, hasMore };
    } catch (e) {
        console.error(e);
        return null;
    }
}
