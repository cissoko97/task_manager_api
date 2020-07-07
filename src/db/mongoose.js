// this file will handle connection logic to mongoDB database
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB_URI, { useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Succefull connect to mongoose');
}).catch(err => {
    console.log('Error when try to connect to Mongoose');
    console.log(err);
});

mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', true);

module.exports = {
    mongoose
}