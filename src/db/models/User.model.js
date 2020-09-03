const mongoose = require('mongoose');
const lodash = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');


const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        unique: true
    },
    password: {
        type: String,
        minlength: 8,
        required: true
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Number,
            required: true
        }
    }],
    createdAt: {
        type: Date,
        required: true,
        default: Date.now()
    }
});


// **** INSTANCE METHODS ****
UserSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    // return the document except password and sessions  (these shouldn't be made available)
    return lodash.omit(userObject, ['password', 'sessions']);
}

UserSchema.methods.generateAccessAuthToken = function () {
    const user = this;
    return new Promise((resolve, reject) => {
        // Create the json web token and return that
        const API_KEY = process.env.API_KEY;
        jwt.sign({ _id: user._id.toHexString() }, API_KEY, { expiresIn: "15m" }, (err, token) => {
            if (!err) {
                resolve(token);
            } else {
                reject();
            }
        })
    })
}

UserSchema.methods.generateRefreshAuthToken = function () {
    // this method simply generate a 64Byte hex String - it doesn't save it to the database. saveSessionToDatabase does that
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, (err, buffer) => {
            if (!err) {
                let token = buffer.toString('hex');
                return resolve(token)
            }
            return reject(err)
        })
    })
}

UserSchema.methods.createSession = function () {
    let user = this;

    return user.generateRefreshAuthToken().then(refreshToken => {
        return saveSessionToDatabase(user, refreshToken);
    }).then((refreshToken) => {
        // Saved to database successfully 
        // now return the refresh token 
        return refreshToken
    }).catch(e => {
        return Promise.reject('Failed to save session to database.\n' + e);
    })
}

/* MODEL METHODS (static methods)*/

UserSchema.statics.findByIdAndToken = function (_id, token) {
    const user = this;

    return user.findOne({
        _id,
        'sessions.token': token
    })
}


UserSchema.statics.findByCredentials = function (email, password) {
    let user = this;
    return user.findOne({
        email
    }).then(userFound => {
        if (!userFound) {
            return Promise.reject({ message: 'User not found' })
        }

        return new Promise((resolve, reject) => {
            bcrypt.compare(password, userFound.password, (err, res) => {
                if (res) resolve(userFound);
                else {
                    reject({ message: 'User not found' });
                }
            });
        });
    })
}


UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondsSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondsSinceEpoch) {
        return false
    } else {
        return true;
    }
}
/* MIDDLEWARE*/
//before a user document is saved , this code runs

UserSchema.pre('save', function (next) {
    let user = this;
    let costFactor = 10;

    if (user.isModified('password')) {
        // if the password field as been edited/changed then run this code

        // Generate Salt and hash password

        bcrypt.genSalt(costFactor, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash
                next();
            })
        })
    } else {
        next()
    }
})
/* HELPERS METHODS*/
let saveSessionToDatabase = (user, refreshToken) => {
    // save session to database 
    return new Promise((resolve, reject) => {
        let expiresAt = generateRefreshTokenExpiryTime();
        user.sessions.push({ 'token': refreshToken, expiresAt });

        user.save().then(() => {
            return resolve(refreshToken);
        }).catch(e => {
            return reject(e);
        })
    })
}

let generateRefreshTokenExpiryTime = () => {

    // number of days before expiration
    let daysUntilExpire = "10";
    let secondsUntilExpire = ((daysUntilExpire * 24) * 60) * 60;
    return ((Date.now() / 1000) + secondsUntilExpire);
}

const User = mongoose.model('User', UserSchema);

module.exports = {
    User
}