const Joi = require('joi');

module.exports.adminRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*\\W).{6,}$"))
    .required()
    .messages({
      "string.pattern.base":
        "Password must have at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol, and 6+ characters."
    }),
  confirmPassword: Joi.valid(Joi.ref('password')).required()
    .messages({
      'any.only': 'Confirm password must match password.'
    })
});

module.exports.adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
