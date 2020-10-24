const jwt = require('jsonwebtoken')
require('dotenv').config();

const { ACCESS_TOKEN_SECRET } = process.env;

module.exports = (req, res, next) => {
  const token = req.headers['authorization'];
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, ACCESS_TOKEN_SECRET, function(err, decoded) {
        if (err) {
            return res.status(401).json(err);
        }
      req.decoded = decoded;
      next();
    });
  } else {
    // if there is no token
    // return an error
    return res.status(403).send({
        "error": true,
        "message": 'No token provided.'
    });
  }
}