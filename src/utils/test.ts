import { Validator } from './validator';

const schema = Validator.object().keys({
    a: Validator.string(),
    b: Validator.object().keys({
        c: Validator.string(),
        d: Validator.object().keys({
            lol: Validator.number(),
        }),
    }),
});

console.log(
    Validator.validate(schema, {
        a: 'a',
        b: {
            c: 'c',
            d: {
                lol: 3,
            },
        },
    })
);
