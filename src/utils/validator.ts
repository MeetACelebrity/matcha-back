const enum Types {
    STRING = 1,
    NUMBER = 1 << 1,
    BOOLEAN = 1 << 2,
    UNDEFINED = 1 << 3,
    NULL = 1 << 4,
    OBJECT = 1 << 5,
    ARRAY = 1 << 6,
}

const enum Constraints {
    NONE = 0,

    MIN = 1,
    MAX = 1 << 1,
    ALPHANUM = 1 << 2,

    UPPERCASE = 1 << 3,
    LOWERCASE = 1 << 4,
    TRIM = 1 << 5,

    EMAIL = 1 << 6,
    PASSWORD = 1 << 7,
    UUID = 1 << 8,

    INTEGER = 1 << 9,
    NEGATIVE = 1 << 10,
    POSITIVE = 1 << 11,
}

export enum InvalidValueErrors {
    NONE = 'NONE',

    NOT_A_STRING = 'NOT_A_STRING',
    NOT_A_NUMBER = 'NOT_A_NUMBER',
    NOT_A_BOOLEAN = 'NOT_A_BOOLEAN',
    NOT_UNDEFINED = 'NOT_UNDEFINED',
    NOT_NULL = 'NOT_NULL',
    NOT_AN_OBJECT = 'NOT_AN_OBJECT',
    NOT_AN_ARRAY = 'NOT_AN_ARRAY',

    INVALID_MIN = 'INVALID_MIN',
    INVALID_MAX = 'INVALID_MAX',
    INVALID_EMAIL = 'INVALID_EMAIL',

    NOT_ALPHANUM = 'NOT_ALPHANUM',
    NOT_UPPERCASE = 'NOT_UPPERCASE',
    NOT_LOWERCASE = 'NOT_LOWERCASE',
    NOT_TRIM = 'NOT_TRIM',
    NOT_VALID_PASSWORD = 'NOT_VALID_PASSWORD',
    NOT_VALID_UUID = 'NOT_VALID_UUID',

    NOT_AN_INTEGER = 'NOT_AN_INTEGER',
    NOT_A_NEGATIVE_NUMBER = 'NOT_A_NEGATIVE_NUMBER',
    NOT_A_POSITIVE_NUMBER = 'NOT_A_POSITIVE_NUMBER',

    NOT_AUTHORIZED_VALUE = 'NOT_AUTHORIZED_VALUE',
}

export class ValidatorError extends Error {
    error: InvalidValueErrors;
    concernedKey: string;

    constructor(
        message: string | InvalidValueErrors,
        error: InvalidValueErrors = message as InvalidValueErrors,
        concernedKey = ''
    ) {
        super(message);

        this.error = error;
        this.concernedKey = concernedKey;
    }

    static throw(error: ValidatorError | InvalidValueErrors, key?: string) {
        if (error instanceof ValidatorError) {
            const { message, concernedKey } = error;

            return new ValidatorError(
                `${key}: ${message}`,
                error.error,
                concernedKey === '' ? key : concernedKey
            );
        }

        return new ValidatorError(error, error);
    }
}

type ValidatorClasses =
    | ValidatorPrimitive<any>
    | ValidatorObject
    | ValidatorArray;

interface Modifier<T> {
    (value: T): T;
}

interface ValidatorClassesObject {
    [key: string]: ValidatorClasses;
}

const VALIDATOR = Symbol();

export class Validator {
    /**
     * Static methods that are used to construct Types set
     */

    static string(): ValidatorString {
        return new ValidatorString();
    }

    static number(): ValidatorNumber {
        return new ValidatorNumber();
    }

    static boolean(): ValidatorPrimitive<boolean> {
        return new ValidatorPrimitive(Types.BOOLEAN);
    }

    static undefined(): ValidatorPrimitive<undefined> {
        return new ValidatorPrimitive(Types.UNDEFINED);
    }

    static null(): ValidatorPrimitive<null> {
        return new ValidatorPrimitive(Types.NULL);
    }

    static object(): ValidatorObject {
        return new ValidatorObject();
    }

    static array(): ValidatorArray {
        return new ValidatorArray();
    }

    static alternatives(schemas: ValidatorClasses[]): ValidatorAlternative {
        return new ValidatorAlternative(schemas);
    }

    static validate(
        schema: ValidatorClasses,
        value: any
    ): boolean | { error: ValidatorError } {
        try {
            const result = schema.valid(value);

            if (result) return true;
            return false;
        } catch (e) {
            return { error: e };
        }
    }
}

export class ValidatorPrimitive<T> {
    [VALIDATOR]: Types;
    private types: Types;
    protected constraints: Constraints = Constraints.NONE;
    private authorizedValues: null | T[] = null;

    protected modifiers: Modifier<T>[] = [];

    constructor(types: Types) {
        this[VALIDATOR] = types;
        this.types = types;
    }

    whitelist(authorized: T[]): this {
        this.authorizedValues = authorized;

        return this;
    }

    valid(value: any): boolean {
        const typeValue = typeof value;

        switch (typeValue) {
            case 'number':
                if ((this.types & Types.NUMBER) === 0) {
                    throw new ValidatorError(InvalidValueErrors.NOT_A_NUMBER);
                }
                break;
            case 'string':
                if ((this.types & Types.STRING) === 0) {
                    throw new ValidatorError(InvalidValueErrors.NOT_A_STRING);
                }
                break;
            case 'boolean':
                if ((this.types & Types.BOOLEAN) === 0) {
                    throw new ValidatorError(InvalidValueErrors.NOT_A_BOOLEAN);
                }
                break;
            case 'undefined':
                if ((this.types & Types.UNDEFINED) === 0) {
                    throw new ValidatorError(InvalidValueErrors.NOT_UNDEFINED);
                }
                break;
            case 'object':
                if (!((this.types & Types.NULL) !== 0 && value === null)) {
                    throw new ValidatorError(InvalidValueErrors.NOT_AN_OBJECT);
                }
                break;
            default:
                return false;
        }

        if (this.authorizedValues === null) return true;

        if (!this.authorizedValues.includes(value)) {
            throw new ValidatorError(InvalidValueErrors.NOT_AUTHORIZED_VALUE);
        }

        return true;
    }

    applyModifications(value: T): T {
        return this.modifiers.reduce((agg, modifier) => modifier(agg), value);
    }
}

export class ValidatorString extends ValidatorPrimitive<string> {
    private minLength: number = 0;
    private maxLength: number = +Infinity;
    private emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    private alphanumRegex = /^[a-z0-9]+$/i;

    constructor() {
        super(Types.STRING);
    }

    /**
     * Add a valid email constraint.
     */
    email(): this {
        this.constraints |= Constraints.EMAIL;

        return this;
    }

    /**
     * Add a minimal string length constraint
     * @param length The minimal length the string can have, included.
     */
    min(length: number): this {
        this.minLength = length;
        this.constraints |= Constraints.MIN;

        return this;
    }

    /**
     * Add a maximum string length constraint
     * @param length The maximum length the string can have, exempt.
     */
    max(length: number): this {
        this.maxLength = length;
        this.constraints |= Constraints.MAX;

        return this;
    }

    alphanum(): this {
        this.constraints |= Constraints.ALPHANUM;

        return this;
    }

    uppercase(enabled = true): this {
        if ((this.constraints & Constraints.UPPERCASE) !== 0) return this;

        if (enabled) {
            this.modifiers.push(value => value.toUpperCase());
        } else {
            this.constraints |= Constraints.UPPERCASE;
        }

        return this;
    }

    lowercase(enabled = true): this {
        if ((this.constraints & Constraints.LOWERCASE) !== 0) return this;

        if (enabled) {
            this.modifiers.push(value => value.toLowerCase());
        } else {
            this.constraints |= Constraints.LOWERCASE;
        }

        return this;
    }

    trim(enabled = true): this {
        if ((this.constraints & Constraints.TRIM) !== 0) return this;

        if (enabled) {
            this.modifiers.push(value => value.trim());
        } else {
            this.constraints |= Constraints.TRIM;
        }

        return this;
    }

    password(): this {
        this.constraints |= Constraints.PASSWORD;

        return this;
    }

    uuid(): this {
        this.constraints |= Constraints.UUID;

        return this;
    }

    valid(value: string): boolean {
        if (!super.valid(value)) return false;

        if (
            (this.constraints & Constraints.MIN) !== 0 &&
            value.length < this.minLength
        ) {
            throw new ValidatorError(InvalidValueErrors.INVALID_MIN);
        }
        if (
            (this.constraints & Constraints.MAX) !== 0 &&
            value.length >= this.maxLength
        ) {
            throw new ValidatorError(InvalidValueErrors.INVALID_MAX);
        }

        if (
            (this.constraints & Constraints.EMAIL) !== 0 &&
            !this.emailRegex.test(value)
        ) {
            throw new ValidatorError(InvalidValueErrors.INVALID_EMAIL);
        }

        if (
            (this.constraints & Constraints.ALPHANUM) !== 0 &&
            !this.alphanumRegex.test(value)
        ) {
            throw new ValidatorError(InvalidValueErrors.NOT_ALPHANUM);
        }

        if (
            (this.constraints & Constraints.UPPERCASE) !== 0 &&
            value !== value.toUpperCase()
        ) {
            throw new ValidatorError(InvalidValueErrors.NOT_UPPERCASE);
        }

        if (
            (this.constraints & Constraints.LOWERCASE) !== 0 &&
            value !== value.toLowerCase()
        ) {
            throw new ValidatorError(InvalidValueErrors.NOT_LOWERCASE);
        }

        if (
            (this.constraints & Constraints.TRIM) !== 0 &&
            value !== value.trim()
        ) {
            throw new ValidatorError(InvalidValueErrors.NOT_TRIM);
        }

        if (
            (this.constraints & Constraints.PASSWORD) !== 0 &&
            !(
                value.length >= 6 &&
                /\d+/.test(value) &&
                /[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+/.test(
                    value
                )
            )
        ) {
            throw new ValidatorError(InvalidValueErrors.NOT_VALID_PASSWORD);
        }

        if (
            (this.constraints & Constraints.UUID) !== 0 &&
            !(value.length === 36)
        ) {
            throw new ValidatorError(InvalidValueErrors.NOT_VALID_UUID);
        }

        return true;
    }
}

export class ValidatorNumber extends ValidatorPrimitive<number> {
    private minNumber: number = -1;
    private maxNumber: number = -1;

    constructor() {
        super(Types.NUMBER);
    }

    integer(): this {
        this.constraints |= Constraints.INTEGER;

        return this;
    }

    negative(): this {
        this.constraints |= Constraints.NEGATIVE;

        return this;
    }

    positive(): this {
        this.constraints |= Constraints.POSITIVE;

        return this;
    }

    less(num: number): this {
        return this.max(num);
    }

    greater(num: number): this {
        return this.min(num);
    }

    max(num: number): this {
        this.maxNumber = num;
        this.constraints |= Constraints.MAX;

        return this;
    }

    min(num: number): this {
        this.minNumber = num;
        this.constraints |= Constraints.MIN;

        return this;
    }

    valid(value: number): boolean {
        if (!super.valid(value)) return false;

        if (
            (this.constraints & Constraints.INTEGER) !== 0 &&
            (value | 0) !== value
        ) {
            throw new ValidatorError(InvalidValueErrors.NOT_AN_INTEGER);
        }

        if (
            (this.constraints & Constraints.MAX) !== 0 &&
            value >= this.maxNumber
        ) {
            throw new ValidatorError(InvalidValueErrors.INVALID_MAX);
        }

        if (
            (this.constraints & Constraints.MIN) !== 0 &&
            value < this.minNumber
        ) {
            throw new ValidatorError(InvalidValueErrors.INVALID_MIN);
        }

        if ((this.constraints & Constraints.NEGATIVE) !== 0 && value > 0) {
            throw new ValidatorError(InvalidValueErrors.NOT_A_NEGATIVE_NUMBER);
        }

        if ((this.constraints & Constraints.POSITIVE) !== 0 && value <= 0) {
            throw new ValidatorError(InvalidValueErrors.NOT_A_POSITIVE_NUMBER);
        }

        return true;
    }
}

export class ValidatorObject {
    [VALIDATOR] = Types.OBJECT;
    innerObject: ValidatorClassesObject = {};

    private keysValid(keys: ValidatorClassesObject): [string | null, boolean] {
        for (const [key, value] of Object.entries(keys)) {
            if (!(value[VALIDATOR] > 0)) {
                return [key, false];
            }
        }

        return [null, true];
    }

    keys(keys: ValidatorClassesObject): this {
        const [incorrectKey, result] = this.keysValid(keys);
        if (!result) {
            throw new Error(`The key ${incorrectKey} is incorrect !`);
        }

        this.innerObject = {
            ...this.innerObject,
            ...keys,
        };

        return this;
    }

    /**
     * Extend the properties of a `ValidatorObject` with those of another `ValidatorObject`.
     * Overrides the existing properties.
     */
    extend(object: ValidatorObject): this {
        this.innerObject = {
            ...this.innerObject,
            ...object.innerObject,
        };

        return this;
    }

    copy(): ValidatorObject {
        const object = new ValidatorObject();

        object.innerObject = this.innerObject;

        return object;
    }

    valid(obj: { [key: string]: any }): boolean {
        const schemaProperties = Object.keys(this.innerObject).length;
        let index = schemaProperties;

        for (let [key, value] of Object.entries(obj)) {
            const schemaValue = this.innerObject[key];

            if (!(schemaValue[VALIDATOR] > 0)) {
                return false;
            }

            if (schemaValue instanceof ValidatorPrimitive) {
                obj[key] = value = schemaValue.applyModifications(value);
            }

            try {
                schemaValue.valid(value);
            } catch (e) {
                throw ValidatorError.throw(e, key);
            }

            index -= 1;
        }

        return index === 0;
    }
}

export class ValidatorArray {
    [VALIDATOR] = Types.ARRAY;
    innerArray: any[] = [];

    only(acceptedValues: any[]): this {
        this.innerArray = acceptedValues;

        return this;
    }

    valid(array: any[]): boolean {
        if (array.some(trueValue => !this.innerArray.includes(trueValue))) {
            return false;
        }

        return true;
    }
}

export class ValidatorAlternative {
    private schemas: ValidatorClasses[];

    constructor(schemas: ValidatorClasses[]) {
        this.schemas = schemas;
    }

    one(value: any): boolean {
        for (const schema of this.schemas) {
            try {
                if (schema.valid(value)) return true;
            } catch (e) {
                continue;
            }
        }

        return false;
    }

    all(value: any): boolean {
        for (const schema of this.schemas) {
            try {
                if (schema.valid(value)) continue;
            } catch (e) {
                return false;
            }
        }

        return true;
    }
}
