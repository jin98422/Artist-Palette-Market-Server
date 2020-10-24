const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let Artwork = new Schema({    
    title: {
        type: String
    },
    vendor: {
        type: String
    },
    artType: {
        type: String
    },
    variants: {
        type: Array
    },
    tags: {
        type: String
    },
    description: {
        type: String
    },
    file: {
        type: String
    },
    product_id: {
        type: String
    },
    email: {
        type: String
    },
}, {
    timestamps: true
}, {
    colletion: 'Artwork'
});

module.exports = mongoose.model('Artwork', Artwork);