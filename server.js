var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./Movie');
var jwt = require('jsonwebtoken');

var app = express();
module.exports = app; // for testing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });


    });
});

router.route('/movie')
    //find
    .get(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        Movie.find({ title: req.body.title }).select('title year genre actor').exec(function(err, movie) {
            console.log("sending body");
            if (err) {
                return res.json({
                    status: 500, message: "GET movies", msg: 'something went wrong'
                })
            }
            else if ( movie.length === 0)
            {
                return res.json({
                    status: 404, message: "GET movies", msg: 'no movie found'
                })
            }
            else{

                return res.json({
                    status: 200, message: "GET movies",
                    msg: "The movie was found, now displaying information about the movie",
                    movie: movie
                })
            }
        })
    })
    //updateOne
    .put(authJwtController.isAuthenticated,function (req, res) {
        var movie= new Movie();
        movie.title = req.body.title;
        movie.year = req.body.year;
        movie.genre = req.body.genre;
        movie.actor = req.body.actor;

        Movie.updateOne({title: movie.title}).exec(function (err) {
            if(err){
                return res.json({
                    status: 400, message: "Update movies", msg: "movie could not be updated"
                })
            }
            else{
                return res.json({
                    status: 200, message: "Movie Updated", msg: "Successfully updated",
                    UpdatedMovie: movie
                })
            }
        })
        }
    )//save
    .post( authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        if(req.body.actor.length < 3)
            return res.json({status: 404, message: 'not enough actors'});

        var movieNew = new Movie();
        movieNew.title = req.body.title;
        movieNew.year = req.body.year;
        movieNew.genre = req.body.genre;
        movieNew.actor = req.body.actor;

        movieNew.save(function (err) {

            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({status: 404, message: 'A movie with that title already exists. '});
                else
                    return res.json({status: 404, message: 'Missing movie information.'});
            }
            res.json({status: 200, message: 'Movie created!'});
        });
    })
    //findOneAndDelete
    .delete( authJwtController.isAuthenticated, function (req,res) {
        var movie = Movie();
        movie.title = req.body.title;
        Movie.findOneAndDelete({title: movie.title}).exec(function (err) {
            if(err)
            {
                return res.json({status: 404, message: 'movie could not be deleted'})
            }
            else
            {
                return res.json({status: 200, message: 'Movie deleted'
                })
            }
        })
    });

app.use('/', router);

app.use(function(req, res){
    res.status(404).send({success: false, msg: 'http method not supported'});
});

app.listen(process.env.PORT || 8080);
