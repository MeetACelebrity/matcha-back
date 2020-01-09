import { Validator } from './validator';

const schema = Validator.object().keys({
    a: Validator.string().password(),
    // b: Validator.string().password(),
    // c: Validator.string().password(),
    // d: Validator.string().password(),
    // e: Validator.string().password(),
    // f: Validator.string().password(),
    g: Validator.string().password(),
});

const values = {
    a: 'aze',
    // b: 'azertyuiop',
    // c: 'az1',
    // d: 'az=',
    // e: 'azertyuiop1',
    // f: 'azertyuiop=',
    g: "azertyuiop1''",
};

console.log(Validator.validate(schema, values));
