
const dbHelper = require('../config/db.helper');
const response = require('../utils/response.helper');
const message = require('../utils/message.helper');
const emailHelper = require('../config/email.helper');
const common = require('../utils/common.helper');
const bcrypt = require('bcrypt');
const { typeSchema, travelerSchema, requesterSchema, updateProfileSchema } = require('../validations/user.validation');
const { uploadToS3, deleteFromS3 } = require('../utils/s3.helper');

exports.saveUserType = async (req, res) => {
  try {
    const { error, value } = typeSchema.validate(req.body);
    if (error) return response.errorHandler(res, null, error.details[0].message);

    const inputParams = [
      { value: value.user_id },
      { value: value.type_id }
    ];

    await dbHelper.callStoredProcedure('UPSERT_USER_PROFILE', inputParams);

    return response.successHandler(res, null, 'User type saved successfully');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.saveTravelerInfo = async (req, res) => {
  try {
    const { error, value } = travelerSchema.validate(req.body);
    if (error) return response.errorHandler(res, null, error.details[0].message);

    const {
      departureAirport,
      arrivalAirport,
      departureDateTime,
      arrivalDateTime,
      flightNumber,
      pnr,
      description
    } = value;

    const depDate = common.formatDate(departureDateTime);
    const depTime = common.formatTime(departureDateTime);
    const arrDate = common.formatDate(arrivalDateTime);
    const arrTime = common.formatTime(arrivalDateTime);

    const inputParams = [
      { value: req.user.id },

      // Departure Airport
      { value: departureAirport.country || '' },
      { value: departureAirport.state || '' },
      { value: departureAirport.city || '' },
      { value: departureAirport.name },
      { value: departureAirport.icao },
      { value: departureAirport.iata },
      { value: departureAirport.lat },
      { value: departureAirport.lon },
      { value: departureAirport.tz },

      // Arrival Airport
      { value: arrivalAirport.country || '' },
      { value: arrivalAirport.state || '' },
      { value: arrivalAirport.city || '' },
      { value: arrivalAirport.name },
      { value: arrivalAirport.icao },
      { value: arrivalAirport.iata },
      { value: arrivalAirport.lat },
      { value: arrivalAirport.lon },
      { value: arrivalAirport.tz },

      // Flight details
      { value: depDate },
      { value: depTime },
      { value: arrDate },
      { value: arrTime },
      { value: flightNumber },
      { value: pnr || '' },
      { value: description || '' }
    ];

    await dbHelper.callStoredProcedure('SAVE_TRAVELER_INFO', inputParams);

    return response.successHandler(res, null, 'Traveler info saved successfully');
  } catch (err) {
    console.error(err);
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.saveRequesterInfo = async (req, res) => {
  try {
    const { error, value } = requesterSchema.validate(req.body);
    if (error) return response.errorHandler(res, null, error.details[0].message);

    const {
      departureCountry,
      departureState,
      departureCity,
      departureLat,
      departureLon,
      arrivalCountry,
      arrivalState,
      arrivalCity,
      arrivalLat,
      arrivalLon,
      arrivalDate,
      description
    } = value;

    const formattedDate = common.formatDate(arrivalDate);

    const params = [
      { value: req.user.id },
      { value: departureCountry || '' },
      { value: departureState || '' },
      { value: departureCity || '' },
      { value: departureLat || '' },
      { value: departureLon || '' },
      { value: arrivalCountry || '' },
      { value: arrivalState || '' },
      { value: arrivalCity || '' },
      { value: arrivalLat || '' },
      { value: arrivalLon || '' },
      { value: formattedDate },
      { value: description || null }
    ];

    await dbHelper.callStoredProcedure('SAVE_REQUESTER_INFO', params);
    return response.successHandler(res, null, 'Requester info saved successfully');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const inputParams = [{ value: req.user.id }];
    const result = await dbHelper.callStoredProcedure('GET_PROFILE', inputParams);
    return response.successHandler(res, result[0][0], 'Profile fetched');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      dob,
      gender,
      address,
      country,
      state,
      city,
      type_id
    } = req.body;

    const formattedDob = dob ? common.formatDate(dob) : null;

    const profileImageFile = req.files?.profileImage?.[0];
    const coverImageFile = req.files?.coverImage?.[0];

    let profileImageUrl = null;
    let coverImageUrl = null;

    // Get current profile to check for existing images
    const currentProfile = await dbHelper.callStoredProcedure('GET_PROFILE', [{ value: userId }]);
    const currentProfileData = currentProfile[0][0];

    // Upload new profile image if provided
    if (profileImageFile) {
      // Delete old profile image if exists
      if (currentProfileData.profile_image) {
        await deleteFromS3(currentProfileData.profile_image);
      }
      profileImageUrl = await uploadToS3(profileImageFile, 'profile123');
    }

    // Upload new cover image if provided
    if (coverImageFile) {
      // Delete old cover image if exists
      if (currentProfileData.cover_image) {
        await deleteFromS3(currentProfileData.cover_image);
      }
      coverImageUrl = await uploadToS3(coverImageFile, 'profile123');
    }

    const inputParams = [
      { value: userId },
      { value: formattedDob || null },
      { value: gender || null },
      { value: address || null },
      { value: country || null },
      { value: state || null },
      { value: city || null },
      { value: profileImageUrl || currentProfileData.profile_image || '' },
      { value: coverImageUrl || currentProfileData.cover_image || '' },
      { value: type_id }
    ];

    await dbHelper.callStoredProcedure('UPDATE_PROFILE', inputParams);

    return response.successHandler(res, null, 'Profile updated');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};


// exports.verifyPNRDetails = async (req, res) => {
//   try {
//     const { pnr, lastName } = req.body;

//     if (!pnr || !lastName) {
//       return response.errorHandler(res, null, 'PNR and lastName are required');
//     }

//     // Step 1: Get OAuth Token
//     const tokenRes = await axios.post(
//       'https://test.api.amadeus.com/v1/security/oauth2/token',
//       new URLSearchParams({
//         grant_type: 'client_credentials',
//         client_id: 'xtOjQ4PZT813pbFwUCd9usBGkJdP3O1G',
//         client_secret: 'AyxPgOWoAtxucnwK'
//       }),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       }
//     );

//     const accessToken = tokenRes.data.access_token;

//     // Step 2: Get Trip Record Details
//     const pnrRes = await axios.get(
//       `https://test.api.amadeus.com/v1/trip-records?recordLocator=${pnr}&lastName=${lastName}`,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`
//         }
//       }
//     );

//     const flightOffer = pnrRes?.data?.data?.flightOffer;

//     if (!flightOffer) {
//       return response.errorHandler(res, null, 'PNR not found or invalid');
//     }

//     const firstSegment = flightOffer.itineraries[0].segments[0];
//     const lastSegment = flightOffer.itineraries[0].segments.slice(-1)[0];

//     return response.successHandler(res, {
//       departureAirport: firstSegment.departure.iataCode,
//       departureTime: firstSegment.departure.at,
//       arrivalAirport: lastSegment.arrival.iataCode,
//       arrivalTime: lastSegment.arrival.at,
//       flightNumber: firstSegment.carrierCode + firstSegment.number
//     }, 'PNR verified');
//   } catch (err) {
//     console.error('Amadeus PNR API Error:', err?.response?.data || err.message);
//     return response.errorHandler(res, null, 'Failed to verify PNR');
//   }
// };

// exports.generateTestPNR = async (req, res) => {
//   const axios = require('axios');

//   try {
//     // 1. Get access token
//     const tokenRes = await axios.post(
//       'https://test.api.amadeus.com/v1/security/oauth2/token',
//       new URLSearchParams({
//         grant_type: 'client_credentials',
//         client_id: 'xtOjQ4PZT813pbFwUCd9usBGkJdP3O1G',
//         client_secret: 'AyxPgOWoAtxucnwK'
//       }),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       }
//     );

//     const token = tokenRes.data.access_token;

//     // 2. Search for a flight offer
//     const searchRes = await axios.get(
//       'https://test.api.amadeus.com/v2/shopping/flight-offers',
//       {
//         headers: { Authorization: `Bearer ${token}` },
//         params: {
//           originLocationCode: 'JFK',
//           destinationLocationCode: 'LHR',
//           departureDate: '2025-07-01',
//           adults: 1,
//           max: 1
//         }
//       }
//     );

//     const flightOffer = searchRes.data.data[0];

//     if (!flightOffer) {
//       return res.status(404).json({ error: 'No flight offers found' });
//     }

//     // 3. Book the flight to generate a PNR
//     const bookingRes = await axios.post(
//       'https://test.api.amadeus.com/v1/booking/flight-orders',
//       {
//         data: {
//           type: 'flight-order',
//           flightOffers: [flightOffer],
//           travelers: [
//             {
//               id: '1',
//               dateOfBirth: '1990-01-01',
//               name: {
//                 firstName: 'John',
//                 lastName: 'Doe'
//               },
//               contact: {
//                 emailAddress: 'john.doe@example.com',
//                 phones: [
//                   {
//                     deviceType: 'MOBILE',
//                     countryCallingCode: '1',
//                     number: '1234567890'
//                   }
//                 ]
//               },
//               documents: [
//                 {
//                   documentType: 'PASSPORT',
//                   number: '123456789',
//                   expiryDate: '2030-01-01',
//                   issuanceCountry: 'US',
//                   nationality: 'US',
//                   holder: true
//                 }
//               ]
//             }
//           ]
//         }
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     const pnr = bookingRes.data.data.associatedRecords[0].reference;

//     return res.json({
//       message: 'Test booking created successfully',
//       pnr,
//       lastName: 'Doe'
//     });
//   } catch (err) {
//     console.error('Error generating test PNR:', err?.response?.data || err.message);
//     return res.status(500).json({ error: 'Failed to generate test PNR' });
//   }
// };


exports.getMatchedTravelers = async (req, res) => {
  try {
    const { departureAirport, arrivalAirport, radius, selectedDate } = req.body;

    if (!departureAirport || !arrivalAirport || !radius || !selectedDate) {
      return response.errorHandler(res, null, 'Missing required fields');
    }

    const inputParams = [
      { value: req.user.id }, // Add user ID for connection check
      { value: departureAirport.lat },
      { value: departureAirport.lon },
      { value: arrivalAirport.lat },
      { value: arrivalAirport.lon },
      { value: parseInt(radius) },
      { value: selectedDate }
    ];

    const result = await dbHelper.callStoredProcedure('GET_MATCHED_TRAVELERS', inputParams);

    const enriched = result[0].map(row => ({
      ...row,
      context_type: 'traveler',
      context_id: row.traveler_id,
      request_status: row.request_status || null
    }));

    return response.successHandler(res, enriched, 'Matched travelers found');
  } catch (err) {
    return response.errorHandler(res, null, err.message || 'Server error');
  }
};

exports.getMatchedRequesters = async (req, res) => {
  try {
    const { departureAirport, arrivalAirport, radius, selectedDate } = req.body;

    if (!departureAirport || !arrivalAirport || !radius || !selectedDate) {
      return response.errorHandler(res, null, 'Missing required fields');
    }

    const inputParams = [
      { value: req.user.id }, // Add user ID for connection check
      { value: departureAirport.lat },
      { value: departureAirport.lon },
      { value: arrivalAirport.lat },
      { value: arrivalAirport.lon },
      { value: parseInt(radius) },
      { value: selectedDate }
    ];

    const result = await dbHelper.callStoredProcedure('GET_MATCHED_REQUESTERS', inputParams);

    const enriched = result[0].map(row => ({
      ...row,
      context_type: 'requester',
      context_id: row.requester_id,
      request_status: row.request_status || null
    }));

    return response.successHandler(res, enriched, 'Matched requesters found');
  } catch (err) {
    return response.errorHandler(res, null, err.message || 'Server error');
  }
};

exports.sendConnectionRequest = async (req, res) => {
  try {
    const { receiver_id, context_type, context_id } = req.body;
    const requester_id = req.user.id;

    // Validate required fields
    if (!receiver_id || !context_type || !context_id) {
      return response.errorHandler(res, null, 'Receiver ID, context type, and context ID are required');
    }

    // Validate context type
    const allowedContextTypes = ['traveler', 'requester'];
    if (!allowedContextTypes.includes(context_type.toLowerCase())) {
      return response.errorHandler(res, null, 'Invalid context type. Must be "traveler" or "requester".');
    }

    const inputParams = [
      { value: requester_id },
      { value: receiver_id },
      { value: context_type.toLowerCase() },
      { value: context_id }
    ];

    const result = await dbHelper.callStoredProcedure('SEND_CONNECTION_REQUEST', inputParams);

    const dbResponse = result?.[0]?.[0];
    if (!dbResponse || typeof dbResponse.message !== 'string') {
      return response.errorHandler(res, null, 'Unexpected response from database');
    }

    return response.successHandler(res, dbResponse, dbResponse.message);
  } catch (err) {
    const msg = err.message?.toLowerCase() || '';

    if (msg.includes('connection request already exists')) {
      return response.errorHandler(res, null, 'Connection request already exists for this item');
    }

    return response.errorHandler(res, null, err.message || 'Failed to send connection request');
  }
};

exports.updateConnectionRequest = async (req, res) => {
  try {
    const { request_id, status } = req.body;
    const user_id = req.user.id;

    if (!request_id || !status) {
      return response.errorHandler(res, null, 'Request ID and status are required');
    }

    const validStatuses = ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'];
    if (!validStatuses.includes(status)) {
      return response.errorHandler(res, null, 'Invalid status');
    }

    const inputParams = [
      { value: request_id },
      { value: status },
      { value: user_id }
    ];

    const result = await dbHelper.callStoredProcedure('UPDATE_CONNECTION_REQUEST', inputParams);
    return response.successHandler(res, result[0][0], result[0][0].message);
  } catch (err) {
    return response.errorHandler(res, null, err.message || 'Failed to update connection request');
  }
};

exports.getConnectionRequests = async (req, res) => {
  try {
    const user_id = req.user.id;
    const inputParams = [{ value: user_id }];

    const [sent_requests, received_requests] = await dbHelper.callStoredProcedure(
      'GET_CONNECTION_REQUESTS',
      inputParams
    );

    // Normalize reviewSubmittedByMe to boolean
    sent_requests.forEach(req => {
      req.reviewSubmittedByMe = req.reviewSubmittedByMe === 1 || req.reviewSubmittedByMe === true || req.reviewSubmittedByMe === '1';
    });

    received_requests.forEach(req => {
      req.reviewSubmittedByMe = req.reviewSubmittedByMe === 1 || req.reviewSubmittedByMe === true || req.reviewSubmittedByMe === '1';
    });

    return response.successHandler(res, {
      sent_requests,
      received_requests
    }, 'Fetched connection requests');
  } catch (err) {
    return response.errorHandler(res, null, err.message || 'Error fetching requests');
  }
};

exports.submitReview = async (req, res) => {
  try {
    const reviewer_id = req.user.id;
    const { user_id: reviewee_id, rating, comment, connection_request_id } = req.body;

    if (!reviewee_id || !rating || !connection_request_id) {
      return response.errorHandler(res, null, 'Missing required fields');
    }

    const inputParams = [
      { value: reviewer_id },
      { value: reviewee_id },
      { value: connection_request_id },
      { value: rating },
      { value: comment }
    ];

    await dbHelper.callStoredProcedure('SAVE_USER_REVIEW', inputParams);

    return response.successHandler(res, {}, 'Review submitted successfully');
  } catch (err) {
    // Catch the SIGNAL error from MySQL
    if (err.message.includes('You already reviewed this connection')) {
      return response.errorHandler(res, null, 'You already reviewed this connection');
    }
    return response.errorHandler(res, null, err.message || 'Failed to submit review');
  }
};
