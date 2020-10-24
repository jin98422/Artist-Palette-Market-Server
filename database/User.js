const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let User = new Schema({    
    first_name: {
        type: String
    },
    last_name: {
        type: String
    },
    username: {
        type: String,
        default: "",
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    photo: {
        type: String,
        default: "",
    },
    about: {
        type: String,
        default: "",
    },
    type: {
        type: String,
        default: "",
    },
    instagram: {
        type: String,
        default: "",
    },
    hometown: {
        type: String,
        default: "",
    },
    website: {
        type: String,
        default: "",
    },
    token: {
        type: String,
    },
    payment: {
        type: String,
        default: '',
    },
    active: {
        type: Boolean,
        default: false,
    },
}, {
    colletion: 'User'
});

module.exports = mongoose.model('User', User);