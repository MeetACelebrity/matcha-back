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
    isLikedMe: boolean;
    tags: Tags[];
    images: Image[];
}
export async function proposals({
    db,
    uuid,
    limit,
    offset,
    orderBy,
    order,
}: ProposalArgs): Promise<{ data: CardUser[]; hasMore: boolean } | null> {
    try {
        const query = `
            SELECT
                *
            FROM
                proposals_format($1, $2, $3)
            `;

        const { rows: users } = await db.query(query, [uuid, limit, offset]);

        // check result and well format output(get the size, remove it from data), the send it
        const hasMore =
            Array.isArray(users) &&
            users[0] !== undefined &&
            users[0].size - offset - limit > 0;

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
                isLikedMe,
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
                isLikedMe,
                tags:
                    tags !== null
                        ? tags.slice(1, -1).map((tag: string) => ({
                              uuid: tag.slice(1, -1).split(',')[0],
                              text: tag.slice(1, -1).split(',')[1],
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
