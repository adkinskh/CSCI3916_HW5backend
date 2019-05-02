var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./Movie');
var Review = require('./Review');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var parse = require('url-parse');

var app = express();
module.exports = app; // for testing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(cors());

var router = express.Router();

app.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

app.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });

app.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

app.post('/signup', function(req, res) {
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

            res.json({ success: true, message: 'User created!' , ok: true});
        });
    }
});

app.post('/signin', function(req, res) {
    console.log(req.body);
    var userNew = new User();
    //userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        console.log(userNew);
        if (err) res.send(err);
        else if (user === null)
        {
            //console.log("no user");
            res.status(401).send({success: false, message: 'Authentication failed.'});
        }
        else {
            user.comparePassword(userNew.password, function (isMatch) {
                if (isMatch) {
                    //console.log("its a match");
                    var userToken = {id: user._id, username: user.username};
                    var token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json({success: true, token: 'JWT ' + token});
                } else {
                    //console.log("wrong password");
                    res.status(401).send({success: false, message: 'Authentication failed.'});
                }
            });
        }
    });
});

app.route('/movies/:movieId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        Movie.find({"._id" : req.query} ).exec(function(err, movie){

        })
    })

//route all movies
app.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //console.log(req);
        if(req.url.indexOf("reviews=true") !== -1){
            Movie.aggregate([{
                $lookup:
                    {
                        from: "reviews",
                        localField: "title",
                        foreignField: "reviewMovie",
                as: "reviews"
                    }

            }], function (err, result) {
                if (err){
                    res.send(err)
                }
                else{
                   res.send (result)
                }
                }

            )/*.then(function (movies) {
                res.status(200).send([movies]);
                console.log({movies});
            })*/
        }
        else
        {
            Movie.find().exec(function (err, moviefound) {
                res.status(200).send({success: true, movies: moviefound});
            });
        }
    });



//single movie
app.route('/movie')
    //find
    .get(function (req, res) {
        console.log(req.body);
        Movie.find({title: req.body.title}).select('title year genre actor').exec(function (err, movie) {
            console.log("sending body");
            if (err) {
                return res.json({
                    status: 500, message: "GET movies", msg: 'something went wrong'
                })
            } else if (movie.length === 0) {
                return res.json({
                    status: 404, message: "GET movies", msg: 'no movie found'
                })
            } else {
                if ((req.body.hasOwnProperty('review') && req.body.review === true)|| req.params.reviews === true) {
                    Review.find({reviewMovie:  req.body.title}).exec(function (err, review) {
                        if (err) {
                            res.json({
                                status: 500, ReviewMsg: 'something went with the review wrong'
                            })
                        } else if (review.length === 0) {
                            res.json({
                                status: 404, ReviewMsg: 'no review found'
                            })
                        } else {
                            res.json({
                                reviewMsg: "Review found, sending review and movie",
                                movie: movie,
                                review: review
                            })
                        }
                    });
                }
                else{
                    return res.json({
                        status: 200, message: "GET movies",
                        msg: "The movie was found, now displaying information about the movie",
                        movie: movie
                    })

                }

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
        movie.imageUrl = req.body.imageUrl;

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
        if (req.body.actor.length < 3)
            return res.json({status: 404, message: 'not enough actors'});
        let usertoken = req.headers.authorization;

        let token = usertoken.split(' ');

        let decoded = jwt.verify(token[1], process.env.SECRET_KEY);


        if (req.body.hasOwnProperty('review') && req.body.review === true) {
            Movie.find({title: req.body.title}).exec(function (err, movie) {
                if (movie.length === 0) {
                    return res.json({status: 404, message: 'A movie with that title does not exists. '});
                }
                let reviewNew = new Review();
                reviewNew.reviewUser = decoded.username;
                reviewNew.reviewMovie = req.body.title;
                reviewNew.rating = req.body.rating;
                reviewNew.quote = req.body.quote;

                reviewNew.save(function (err) {

                    if (err) {
                        // duplicate entry
                        if (err.code === 11000)
                            return res.json({
                                status: 400,
                                message: 'A review with that movie title and user already exists.'
                            });
                        else
                            return res.json({status: 404, message: 'Movie review could not be created.'});
                    }
                    res.json({status: 200, message: 'Review created!'});
                });
            })
        }
        else {
            let movieNew = new Movie();
            movieNew.title = req.body.title;
            movieNew.year = req.body.year;
            movieNew.genre = req.body.genre;
            movieNew.actor = req.body.actor;

            movieNew.save(function (err) {

                if (err) {
                    // duplicate entry
                    if (err.code === 11000)
                        return res.json({status: 404, message: 'A movie with that title already exists. '});
                    else
                        return res.json({status: 404, message: 'Missing movie information.'});
                }
                res.json({status: 200, message: 'Movie created!'});
            });
        }
    })
    //findOneAndDelete
    .delete(authJwtController.isAuthenticated, function (req,res) {
        let movie = Movie();
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

app.listen(process.env.PORT || 10808);
