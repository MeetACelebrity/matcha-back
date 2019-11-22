import { ModelArgs } from './index';

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
    limit: Number;
    offset: Number;
    orderBy: OrderBy;
    order: Order;
}

export async function proposals({
    db,
    uuid,
    limit,
    offset,
    orderBy,
    order,
}: ProposalArgs) {
    try {
        const query = `
            SELECT
                *
            FROM
                proposals($1, $2, $3)
            `;

        const { rows: users } = await db.query(query, [uuid, limit, offset]);

        // check result and well format output(get the size, remove it from data), the send it
        return users;
    } catch (e) {
        console.error(e);
        return null;
    }
}
