require('dotenv').config(); // 👈 add this at the very top

const Joi = require('joi');

if (!process.env.ACCESS_CODE) {
  throw new Error("❌ ACCESS_CODE is not defined in .env file");
}

module.exports.studentRegisterSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  mobile: Joi.string().length(10).required(),
  password: Joi.string()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*\\W).{6,}$"))
    .required()
    .messages({
      "string.pattern.base":
        "Password must have at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol, and 6+ characters."
    }),
  confirmPassword: Joi.ref('password'),
  accessCode: Joi.string().valid(process.env.ACCESS_CODE).required()
});

module.exports.studentLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});



//const Joi = require('joi');

// module.exports.studentRegisterSchema = Joi.object({
//   name: Joi.string().required(),
//   email: Joi.string().email().required(),
//   mobile: Joi.string().length(10).required(),
//   password: Joi.string()
//     .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*\\W).{6,}$"))
//     .required()
//     .messages({
//       "string.pattern.base":
//         "Password must have at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol, and 6+ characters."
//     }),
//   confirmPassword: Joi.ref('password'),
//   accessCode: Joi.string().valid(process.env.ACCESS_CODE).required()

// });

// module.exports.studentLoginSchema = Joi.object({
//   email: Joi.string().email().required(),
//   password: Joi.string().required()
// });
