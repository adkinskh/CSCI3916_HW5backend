var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
//mongoose.set('useCreateIndex', true);

// user schema
var ReviewSchema = new Schema({
    userMovie: {
        type: Array,
        required: true,
        index:{unique:false}},

    rating: {type: Number, enum:[1,2,3,4,5], required: true},

    quote: {type: String, required: true}

});

// return the model
module.exports = mongoose.model('Review', ReviewSchema);