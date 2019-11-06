import { InternalUser, ExternalUser } from './user';

export type PublicUser = Omit<ExternalUser, 'email' | 'roaming'>;

export function internalUserToPublicUser({
    id,
    uuid,
    givenName,
    familyName,
    username,
    email,
    createdAt,
    confirmed,
    birthday,
    biography,
    gender,
    sexualOrientation,
    images,
    addresses,
    tags,
    location,
    roaming,
}: InternalUser): PublicUser {
    return {
        uuid,
        givenName,
        familyName,
        username,
        createdAt,
        confirmed,
        birthday,
        biography,
        gender,
        sexualOrientation,
        location,
        images,
        addresses,
        tags,
    };
}
