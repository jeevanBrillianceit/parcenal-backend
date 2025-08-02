const Joi = require('joi');

const typeSchema = Joi.object({
  user_id: Joi.number().required(),
  type_id: Joi.number().required()
});

const airportSchema = Joi.object({
  icao: Joi.string().required(),
  iata: Joi.string().allow('').optional(),
  name: Joi.string().required(),
  city: Joi.string().allow('').optional(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  lat: Joi.number().required(),
  lon: Joi.number().required(),
  elevation: Joi.number().optional(),
  tz: Joi.string().optional()
});

const travelerSchema = Joi.object({
  departureAirport: airportSchema.required(),
  arrivalAirport: airportSchema.required(),
  departureDateTime: Joi.string().isoDate().required(),
  arrivalDateTime: Joi.string().isoDate().required(),
  flightNumber: Joi.string().required(),
  pnr: Joi.string().allow('', null).optional(),
  description: Joi.string().allow('', null).optional()
});

const requesterSchema = Joi.object({
  departureCountry: Joi.string().required(),
  departureState: Joi.string().required(),
  departureCity: Joi.string().required(),
  departureLat: Joi.number().required(),
  departureLon: Joi.number().required(),

  arrivalCountry: Joi.string().allow(null, ''),
  arrivalState: Joi.string().allow(null, ''),
  arrivalCity: Joi.string().allow(null, ''),
  arrivalLat: Joi.number().allow(null),
  arrivalLon: Joi.number().allow(null),

  arrivalDate: Joi.date().greater('now').required(),
  description: Joi.string().allow('', null).optional()
});


const updateProfileSchema = Joi.object({
  dob: Joi.date().iso().required().label('Date of Birth'),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  address: Joi.string().max(255).required(),
  country: Joi.string().max(100).required(),
  state: Joi.string().max(100).required(),
  city: Joi.string().max(100).required()
});


module.exports = { typeSchema, travelerSchema, requesterSchema, updateProfileSchema };
