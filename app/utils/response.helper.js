exports.successHandler = (res, data = null, message = "") => {
  return res.status(200).json({
    status: 1,
    response: message,
    data
  });
};

exports.errorHandler = (res, next, message) => {
  return res.status(400).json({ status: 0, response: message });
};
