import { Validator } from './validator';

const schema = Validator.object().keys({
    a: Validator.object().keys({
        b: Validator.object().keys({
            c: Validator.object().keys({
                d: Validator.string().email(),
            }),
        }),
    }),
    thisIsANumber: Validator.number()
        .greater(6)
        .less(9),
    b: Validator.object().keys({
        c: Validator.string(),
        d: Validator.object().keys({
            lol: Validator.number(),
        }),
    }),
});

const values = {
    a: {
        b: {
            c: {
                d: '            AHHHHHHHHHHHHHHHHHHHHHHHH !               ',
            },
        },
    },
    thisIsANumber: 6,
    b: {
        c: 'c',
        d: {
            lol: 3,
        },
    },
};

console.log(Validator.validate(schema, values));
