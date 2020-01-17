import uuid from 'uuid/v4';
import faker from 'faker';
import { subWeeks } from 'date-fns';
import { promises as fs } from 'fs';
import { hash } from 'argon2';

import { Database } from '../src/database';
import {
    updateBiographyReturnQuery,
    updateExtendedUserReturnQuery,
    addTagsReturnQuery,
    SexualOrientation,
    updateProfilePicsReturnQuery,
    Gender,
    updateAddressReturnQuery,
} from '../src/models/user';
import { join } from 'path';

const SEED_FILE_PATH = join(__dirname, './seed.json');

class User {
    private uuid: string;
    private username: string;
    private givenName: string;
    private familyName: string;
    private email: string;
    private password: string;
    private score: number;
    private location: boolean;
    private roamming: string;

    private address: { lat: string; lon: string };

    private birthday: Date;
    private gender: Gender;
    private sexualOrientation: SexualOrientation;
    private biography: string;

    private tag1: string;
    private tag2: string;
    private tag3: string;

    private lastSeen: Date;

    private pics: string;

    constructor() {
        const tagsChoices = [
            'car',
            'elon musk',
            'tesla',
            'spacex',
            'entrepreneur',
            'stoicisme',
            'jordan belfort',
        ];

        const roamingChoices = ['ACCEPTED', 'REFUSED', 'NOT_SET'];
        const genderChoices = Object.values(Gender).map(
            value => value as Gender
        );
        const sexualOrientationChoices: SexualOrientation[] = Object.values(
            SexualOrientation
        ).map(value => value as SexualOrientation);

        // generate users
        this.uuid = uuid();
        this.username = faker.internet.userName();
        this.givenName = faker.name.firstName();
        this.familyName = faker.name.lastName();
        this.email = faker.internet.email();
        this.password = faker.internet.password();
        this.score = faker.random.number({
            min: 100,
            max: 1000,
        });
        this.location = faker.random.boolean();
        this.roamming = roamingChoices[faker.random.number({ min: 0, max: 2 })];

        // generate addresses
        this.address = faker.random.arrayElement([
            { lat: '43.1167', lon: '5.9333' }, // Toulon
            { lat: '49.4431 ', lon: '1.0993' }, // Rouen
            { lat: '45.7676  ', lon: '4.8345' }, // Lyon 1er
            { lat: '48.3 ', lon: '4.0833' }, // Troyes
            { lat: '50.6333 ', lon: '3.0667' }, // Lille
            { lat: '48.8835 ', lon: '2.3219' }, // Paris 17e
            { lat: '48.9167', lon: '2.2833' }, // Asnieres
        ]);
        // generate extended profiled
        this.birthday = new Date(
            Date.UTC(
                faker.random.number({ min: 1950, max: 2001 }),
                faker.random.number({ min: 1, max: 12 }),
                faker.random.number({ min: 1, max: 20 })
            )
        );
        this.gender = genderChoices[faker.random.number({ min: 0, max: 1 })];
        this.sexualOrientation =
            sexualOrientationChoices[faker.random.number({ min: 0, max: 2 })];
        this.biography = faker.lorem.sentence();

        // generate tags
        this.tag1 =
            tagsChoices[
                faker.random.number({ min: 0, max: tagsChoices.length - 1 })
            ];
        this.tag2 =
            tagsChoices[
                faker.random.number({ min: 0, max: tagsChoices.length - 1 })
            ];
        this.tag3 =
            tagsChoices[
                faker.random.number({ min: 0, max: tagsChoices.length - 1 })
            ];

        this.pics =
            this.gender === ('MALE' as any)
                ? `${faker.random.number({ min: 1, max: 4 })}.jpg`
                : `${faker.random.number({ min: 5, max: 7 })}.jpg`;

        this.lastSeen = faker.date.between(subWeeks(new Date(), 1), new Date());
    }

    get userUuid() {
        return this.uuid;
    }
    get userAddress() {
        return this.address;
    }
    get userBirthday() {
        return this.birthday;
    }
    get userGender() {
        return this.gender;
    }
    get userSexualOrientation() {
        return this.sexualOrientation;
    }
    get userBiography() {
        return this.biography;
    }
    get userTag1() {
        return this.tag1;
    }
    get userTag2() {
        return this.tag2;
    }
    get userTag3() {
        return this.tag3;
    }
    get userPics() {
        return this.pics;
    }

    async toPGSQL() {
        return {
            text: `
                INSERT INTO users(
                    confirmed,
                    uuid,
                    username,
                    given_name,
                    family_name,
                    email,
                    password,
                    score,
                    location,
                    roaming,
                    last_seen
                )
                VALUES (
                    TRUE,
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10
                )
            `,
            values: [
                this.uuid,
                this.username,
                this.givenName,
                this.familyName,
                this.email,
                await hash(this.password),
                this.score,
                this.location,
                this.roamming,
                this.lastSeen,
            ],
        };
    }
}

async function generateSeedFile(db: Database) {
    const USERS_COUNT = 500;

    const queries: { text: string; values: any[] }[] = [];

    for (let index = 0; index < USERS_COUNT; index += 1) {
        const user = new User();

        // insert user
        queries.push(await user.toPGSQL());

        // insert addresses --> primary and current

        const firstAddressResult = await updateAddressReturnQuery({
            db,
            uuid: user.userUuid,
            isPrimary: true,
            lat: Number(user.userAddress.lat),
            long: Number(user.userAddress.lon),
            name: '',
            administrative: '',
            county: '',
            country: '',
            city: '',
            auto: true,
        });
        if (firstAddressResult === null) return;

        queries.push(firstAddressResult);

        const secondAddressResult = await updateAddressReturnQuery({
            db,
            uuid: user.userUuid,
            isPrimary: false,
            lat: Number(user.userAddress.lat),
            long: Number(user.userAddress.lon),
            name: '',
            administrative: '',
            county: '',
            country: '',
            city: '',
            auto: true,
        });
        if (secondAddressResult === null) return;

        queries.push(secondAddressResult);

        // insert extended profile
        queries.push(
            updateExtendedUserReturnQuery({
                db,
                uuid: user.userUuid,
                gender: user.userGender,
                birthday: user.userBirthday.toISOString(),
                sexualOrientation: user.userSexualOrientation,
            })
        );

        queries.push(
            updateBiographyReturnQuery({
                db,
                uuid: user.userUuid,
                biography: user.userBiography,
            })
        );

        // insert tags
        queries.push(
            addTagsReturnQuery({ db, uuid: user.userUuid, tag: user.userTag1 })
        );
        queries.push(
            addTagsReturnQuery({ db, uuid: user.userUuid, tag: user.userTag2 })
        );
        queries.push(
            addTagsReturnQuery({ db, uuid: user.userUuid, tag: user.userTag3 })
        );

        // insert profile pics
        queries.push(
            updateProfilePicsReturnQuery({
                db,
                uuid: user.userUuid,
                newPics: user.userPics,
            })
        );
    }

    await fs.writeFile(SEED_FILE_PATH, JSON.stringify(queries, null, 2));

    console.log(`Generated the seed file and saved it at ${SEED_FILE_PATH}`);
}

async function insertSeedIntoDatabase(db: Database) {
    console.log(`Load seed file from ${SEED_FILE_PATH}`);

    const seed: { text: string; values: any[] }[] = JSON.parse(
        await fs.readFile(SEED_FILE_PATH, {
            encoding: 'utf-8',
        })
    );

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        for (const query of seed) {
            await client.query(query);
        }

        await client.query('COMMIT');

        console.log('Filled the database 🎉');
    } catch (e) {
        console.error(e);
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }

    await db.end();
}

(async () => {
    const db = new Database();

    await generateSeedFile(db);

    // await insertSeedIntoDatabase(db);
})().catch(console.error);
