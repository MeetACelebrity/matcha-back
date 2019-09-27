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

    INTEGER = 1 << 7,
    NEGATIVE = 1 << 8,
    POSITIVE = 1 << 9,
}

type ValidatorClasses = ValidatorPrimitive | ValidatorObject | ValidatorArray;

interface Modifier {
    (obj: { [key: string]: any }, key: string): void;
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

    static boolean(): ValidatorPrimitive {
        return new ValidatorPrimitive(Types.BOOLEAN);
    }

    static undefined(): ValidatorPrimitive {
        return new ValidatorPrimitive(Types.UNDEFINED);
    }

    static null(): ValidatorPrimitive {
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

    static validate(schema: ValidatorClasses, value: any): boolean {
        return schema.valid(value);
    }
}

export class ValidatorPrimitive {
    [VALIDATOR]: Types;
    private types: Types;
    protected constraints: Constraints = Constraints.NONE;

    protected modifiers: Modifier[] = [];

    constructor(Types: Types) {
        this[VALIDATOR] = Types;
        this.types = Types;
    }

    valid(value: any): boolean {
        const typeValue = typeof value;

        switch (typeValue) {
            case 'number':
                if ((this.types & Types.NUMBER) === 0) return false;
                break;
            case 'string':
                if ((this.types & Types.STRING) === 0) return false;
                break;
            case 'boolean':
                if ((this.types & Types.BOOLEAN) === 0) return false;
                break;
            case 'undefined':
                if ((this.types & Types.UNDEFINED) === 0) return false;
                break;
            case 'object':
                if ((this.types & Types.NULL) !== 0 && value === null)
                    return true;
            default:
                return false;
        }

        return true;
    }

    applyModifications(obj: { [key: string]: any }, key: string) {
        this.modifiers.forEach(fn => fn(obj, key));
    }
}

export class ValidatorString extends ValidatorPrimitive {
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
    email(): ValidatorString {
        this.constraints |= Constraints.EMAIL;

        return this;
    }

    /**
     * Add a minimal string length constraint
     * @param length The minimal length the string can have, included.
     */
    min(length: number): ValidatorString {
        this.minLength = length;
        this.constraints |= Constraints.MIN;

        return this;
    }

    /**
     * Add a maximum string length constraint
     * @param length The maximum length the string can have, exempt.
     */
    max(length: number): ValidatorString {
        this.maxLength = length;
        this.constraints |= Constraints.MAX;

        return this;
    }

    alphanum(): ValidatorString {
        this.constraints |= Constraints.ALPHANUM;

        return this;
    }

    uppercase(enabled = true) {
        if ((this.constraints & Constraints.UPPERCASE) !== 0) return this;

        if (enabled === true) {
            this.modifiers.push((obj, key) => {
                obj[key] = (obj[key] as string).toUpperCase();
            });
        } else {
            this.constraints |= Constraints.UPPERCASE;
        }

        return this;
    }

    lowercase(enabled = true) {
        if ((this.constraints & Constraints.LOWERCASE) !== 0) return this;

        if (enabled === true) {
            this.modifiers.push((obj, key) => {
                obj[key] = (obj[key] as string).toLowerCase();
            });
        } else {
            this.constraints |= Constraints.LOWERCASE;
        }

        return this;
    }

    trim(enabled = true) {
        if ((this.constraints & Constraints.TRIM) !== 0) return this;

        if (enabled === true) {
            this.modifiers.push((obj, key) => {
                obj[key] = (obj[key] as string).trim();
            });
        } else {
            this.constraints |= Constraints.TRIM;
        }

        return this;
    }

    valid(value: string): boolean {
        if (super.valid(value) === false) return false;

        if (
            (this.constraints & Constraints.MIN) !== 0 &&
            value.length < this.minLength
        )
            return false;
        if (
            (this.constraints & Constraints.MAX) !== 0 &&
            value.length >= this.maxLength
        )
            return false;

        if (
            (this.constraints & Constraints.EMAIL) !== 0 &&
            this.emailRegex.test(value) === false
        )
            return false;

        if (
            (this.constraints & Constraints.ALPHANUM) !== 0 &&
            this.alphanumRegex.test(value) === false
        )
            return false;

        if (
            (this.constraints & Constraints.UPPERCASE) !== 0 &&
            value !== value.toUpperCase()
        )
            return false;

        if (
            (this.constraints & Constraints.LOWERCASE) !== 0 &&
            value !== value.toLowerCase()
        )
            return false;

        if (
            (this.constraints & Constraints.TRIM) !== 0 &&
            value !== value.trim()
        )
            return false;

        return true;
    }
}

export class ValidatorNumber extends ValidatorPrimitive {
    private minNumber: number = -1;
    private maxNumber: number = -1;

    constructor() {
        super(Types.NUMBER);
    }

    integer(): ValidatorNumber {
        this.constraints |= Constraints.INTEGER;

        return this;
    }

    negative(): ValidatorNumber {
        this.constraints |= Constraints.NEGATIVE;

        return this;
    }

    positive(): ValidatorNumber {
        this.constraints |= Constraints.POSITIVE;

        return this;
    }

    less(number: number): ValidatorNumber {
        return this.max(number);
    }

    greater(number: number): ValidatorNumber {
        return this.min(number);
    }

    max(number: number): ValidatorNumber {
        this.maxNumber = number;
        this.constraints |= Constraints.MAX;

        return this;
    }

    min(number: number): ValidatorNumber {
        this.minNumber = number;
        this.constraints |= Constraints.MIN;

        return this;
    }

    valid(value: number): boolean {
        if (super.valid(value) === false) return false;

        if (
            (this.constraints & Constraints.INTEGER) !== 0 &&
            (value | 0) !== value
        )
            return false;

        if (
            (this.constraints & Constraints.MAX) !== 0 &&
            value >= this.maxNumber
        )
            return false;

        if (
            (this.constraints & Constraints.MIN) !== 0 &&
            value < this.minNumber
        )
            return false;

        if ((this.constraints & Constraints.NEGATIVE) !== 0 && value > 0)
            return false;

        if ((this.constraints & Constraints.POSITIVE) !== 0 && value <= 0)
            return false;

        return true;
    }
}

export class ValidatorObject {
    [VALIDATOR] = Types.OBJECT;
    innerObject: ValidatorClassesObject = {};

    private keysValid(keys: ValidatorClassesObject): [string | null, boolean] {
        for (const [key, value] of Object.entries(keys)) {
            if (!(typeof keys === 'object' && value[VALIDATOR] > 0))
                return [key, false];
        }

        return [null, true];
    }

    keys(keys: ValidatorClassesObject): ValidatorObject {
        const [incorrectKey, result] = this.keysValid(keys);
        if (result === false)
            throw new Error(`The key ${incorrectKey} is incorrect !`);

        this.innerObject = keys;

        return this;
    }

    valid(obj: object): boolean {
        const schemaProperties = Object.keys(this.innerObject).length;
        let index = schemaProperties;

        for (const [key, value] of Object.entries(obj)) {
            const schemaValue = this.innerObject[key];

            if (
                !(
                    typeof schemaValue === 'object' &&
                    schemaValue[VALIDATOR] > 0 &&
                    typeof schemaValue.valid === 'function'
                )
            ) {
                return false;
            }

            if (!schemaValue.valid(value)) return false;

            if (schemaValue instanceof ValidatorPrimitive)
                schemaValue.applyModifications(obj, key);

            index--;
        }

        return index === 0;
    }
}

export class ValidatorArray {
    [VALIDATOR] = Types.ARRAY;
    innerArray: any[] = [];

    only(acceptedValues: any[]): ValidatorArray {
        this.innerArray = acceptedValues;

        return this;
    }

    valid(array: any[]): boolean {
        if (array.some(trueValue => !this.innerArray.includes(trueValue)))
            return false;

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
            if (schema.valid(value) === true) return true;
        }

        return false;
    }

    all(value: any): boolean {
        for (const schema of this.schemas) {
            if (schema.valid(value) === false) return false;
        }

        return true;
    }
}