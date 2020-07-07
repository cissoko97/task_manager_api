const jwt = require('jsonwebtoken');
const { User } = require('../db/models')

module.exports = {

    //Verify Refresh Token Middlware (which will be verifiyng the session)
    verifySession: (req, res, next) => {
        // grab the refresh token from the request header
        let refreshToken = req.header('x-refresh-token');

        // grab the _id token from the request header
        let _id = req.header('_id');

        User.findByIdAndToken(_id, refreshToken).then((user) => {
            if (!user) {
                // User couldn't be found
                return Promise.reject({
                    error: 'User not found. Make sure that the refresh token and the user id are correct'
                })
            }
            // if the code reaches here - the user was found
            // therefore the refresh token exists in the database - but we still have to check if it has expired or not 
            req.user_id = user._id;
            req.userObject = user;
            req.refreshtoken = refreshToken;

            let isSessionValid = false;
            user.sessions.forEach((session) => {
                if (session.token === refreshToken) {
                    // check if the session has expired
                    if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                        // refresh token has not expired
                        isSessionValid = true
                    }
                }
            })

            if (isSessionValid) {
                // the session is VALID - call next() to continues processing this web request
                next()
            } else {
                return Promise.reject({ error: 'Refresh token are expired or the session are not valid' })
            }
        }).catch(err => {
            res.status(401).send(err);
        })
    },
    authenticate: (req, res, next) => {
        let token = req.header('x-access-token');
        jwt.verify(token, process.env.API_KEY, (err, decoded) => {
            if (err) {
                // there was an error
                // jwt is invalid - * Do not Authenticate *
                res.status(401).send(err)
            } else {
                req.user_id = decoded._id
                next()
            }
        })

    }

}