import uuid from 'uuid/v4';
import { hash } from 'argon2';

import { ModelArgs } from './index';

export interface CreateUserArgs extends ModelArgs {
    email: string;
    username: string;
    givenName: string;
    familyName: string;
    password: string;
}

export interface User {
    //
}

export async function createUser({
    db,
    email,
    username,
    givenName,
    familyName,
    password,
}: CreateUserArgs): Promise<string | null> {
    const id = uuid();

    const query = `
		INSERT INTO users (
			uuid,
			email,
			username,
			given_name,
			family_name,
			password
		) 
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6
		)
	`;

    try {
        await db.query(query, [
            id,
            email,
            username,
            givenName,
            familyName,
            await hash(password),
        ]);

        return id;
    } catch (e) {
        return null;
    }
}
