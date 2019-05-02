var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
//mongoose.set('useCreateIndex', true);

// user schema
var MovieSchema = new Schema({
    title:{type: String, required: true, index:{unique:true}},
    year: { type: Number, required: true},
    genre: {type: String, enum:['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery',
            'Thriller', 'Western'], required: true},
    actor: { type: Array, required: true},
    imageUrl: {type: String}
});

// return the model
module.exports = mongoose.model('Movie', MovieSchema);