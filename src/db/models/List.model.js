const mongoose = require('mongoose');

const ListSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
    },
    _userId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now()
    }
})

const List = mongoose.model('List', ListSchema);

module.exports = {
    List
}