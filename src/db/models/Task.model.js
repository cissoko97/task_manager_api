const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
    },
    _listId: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    complete: {
        type: Boolean,
        required: true,
        default: false
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now()
    }
});

const Task = mongoose.model('Task', TaskSchema);

module.exports = {
    Task
}