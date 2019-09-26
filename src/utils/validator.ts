const enum Types {
    STRING = 1,
    NUMBER = 1 << 1,
    BOOLEAN = 1 << 2,
    UNDEFINED = 1 << 3,
    NULL = 1 << 4,
    OBJECT = 1 << 5,
    ARRAY = 1 << 6,
}

type ValidatorClasses = ValidatorPrimitive | ValidatorObject | ValidatorArray;

interface ValidatorClassesObject {
    [key: string]: ValidatorClasses;
}

const VALIDATOR = Symbol();

export class Validator {
    /**
     * Static methods that are used to construct Types set
     */

    static string(): ValidatorPrimitive {
        return new ValidatorPrimitive(Types.STRING);
    }

    static number(): ValidatorPrimitive {
        return new ValidatorPrimitive(Types.NUMBER);
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

    static validate(schema: ValidatorClasses, value: any): boolean {
        return schema.valid(value);
    }
}

export class ValidatorPrimitive {
    [VALIDATOR]: Types;
    private types: Types;

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
