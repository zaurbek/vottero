var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var bcrypt = require('bcryptjs');
app.set('view engine', 'pug');
app.locals.pretty = true;

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;

var secure = require('./secure.js')
var mongokey = secure.mongokey;
console.log(mongokey)

var session = require('client-sessions');
var mongoose = require('mongoose');
mongoose.connect(mongokey);
var UserSchema = mongoose.Schema;
var ObjectId = UserSchema.ObjectId;

var User = new UserSchema({
    id: ObjectId,
    firstName: String,
    email: {
        type: String,
        unique: true
    },
    password: String
})
var User = mongoose.model('Users', User)

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('kek')
});

//middleware
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({cookieName: 'session', secret:'jfjasdfkw3ichh47HIIIIIFREEEEEEEEEEECCOOOOOOOOOOOOOOOOODEEEEEEECAAAAAAAAAAAAAAMP', duration: 60*60*30 *1000, activeDuration: 6060*60 *1000}))

app.use(function(req, res, next) {
    if (req.session && req.session.user) {
        User.findOne({
            email: req.session.user.email
        }, function(err, user) {
            if (user) {
                req.user = user;
                delete req.user.password;
                req.session.user = req.user;
                res.locals.user = req.user
            }
            next()
        })
    } else {
        next()
    }
})

function requireLogin(req, res, next) {
    if (!req.user) {
        res.redirect('/')
    } else {
        next();
    }
}

app.get('/', function(req, res) {
    if (req.user) {
        res.redirect('/dashboard')
    } else {
        MongoClient.connect(mongokey, function(err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('Connection established through direct mongoDB driver');

                var collection = db.collection('polls')

                var mongoAccess = function(db, callback) {
                    collection.find({}, {
                        _id: 0,
                        question: 1,
                        creator: 1,
                        number: 1
                    }).sort({_id: -1}).toArray().then(function(snap) {
                        if (snap) {

                            console.log(snap)
                            res.render('index.pug', {array: snap});

                        }

                    }).catch(function(error) {
                        console.log(error)
                    })

                }

                mongoAccess(db, function() {
                    db.close()
                })

            }
        });

    }

})

app.get('/register', function(req, res) {
    if (req.user) {
        res.redirect('/dashboard')
    } else {
        res.render('register.pug')
    }

})

app.post('/register', function(req, res) {
    console.log(req.body.password)

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
            var parseuser = new User({firstName: req.body.firstName, email: req.body.email.toLowerCase(), password: hash})

            parseuser.save(function(err) {
                if (err) {
                    if (err.code == 11000) {
                        err = 'This email is already taken by somebody'
                    }

                    res.render('register.pug', {error: err})

                } else {

                    req.session.user = {
                        firstName: req.body.firstName,
                        email: req.body.email.toLowerCase()
                    }

                    res.redirect('/dashboard')
                }
            })
        });
    });

})

app.get('/login', function(req, res) {
    if (req.user) {
        res.redirect('/dashboard')
    } else {
        res.render('login.pug')
    }

})

app.post('/login', function(req, res) {
    console.log('lol')
    User.findOne({
        email: req.body.email.toLowerCase()
    }, function(err, user) {
        if (!user) {
            res.render('login.pug', {error: 'Invalid email or password.'})
        } else {
            bcrypt.compare(req.body.password, user.password).then((respond) => {
                if (respond) {
                    req.session.user = user; 

                    res.redirect('/dashboard')

                } else {
                    res.render('login.pug', {error: 'Invalid email or password.'})
                }
            });
        }
    })
})

app.get('/dashboard', requireLogin, function(req, res) {
    if (!req.user) {
        res.redirect('/')
    } else {
        MongoClient.connect(mongokey, function(err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('Connection established through direct mongoDB driver');

                var collection = db.collection('polls')

                var mongoAccess = function(db, callback) {
                    collection.find({}, {
                        _id: 0,
                        question: 1,
                        creator: 1,
                        number: 1
                    }).sort({_id: -1}).toArray().then(function(snap) {
                        if (snap) {
                            console.log(snap)
                            res.render('dashboard.pug', {array: snap});

                        }

                    }).catch(function(error) {
                        console.log(error)
                    })

                }

                mongoAccess(db, function() {
                    db.close()
                })

            }
        });

    }

})

app.get('/polls', requireLogin, function(req, res) {
    if (!req.user) {
        res.redirect('/')
    } else {
        MongoClient.connect(mongokey, function(err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('Connection established through direct mongoDB driver');

                var collection = db.collection('polls')

                var mongoAccess = function(db, callback) {
                    collection.find({
                        creator: req.user.email
                    }, {
                        _id: 0,
                        question: 1,
                        creator: 1,
                        number: 1
                    }).sort({_id: -1}).toArray().then(function(snap) {
                        if (snap) {
                            console.log(snap)

                            req.user = req.user
                            req.session.user = req.user
                            var errorchik = req.query.error
                            if (errorchik) {
                                res.render('polls.pug', {
                                    array: snap,
                                    error: 'You already voted or created your own answer on poll "' + errorchik+'"'
                                });

                            } else {
                                res.render('polls.pug', {array: snap});
                            }

                        }

                    }).catch(function(error) {
                        console.log(error)
                    })

                }

                mongoAccess(db, function() {
                    db.close()
                })

            }
        });

    }

})

app.post('/new', function(req, res) {
    MongoClient.connect(mongokey, function(err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
        } else {
            console.log('Connection established through direct mongoDB driver');

            var answers = req.body.answers.split(';')
            for (var i = 0; i < answers.length; i++) {
                answers[i] = answers[i].trim() + '~0'
            }

            var collection = db.collection('polls')

            var mongoAccess = function(db, callback) {
                collection.count().then(function(number) {
                    console.log(number)
                        collection.insert({
                            number: number, 
                            question: req.body.question, 
                            voted: [], 
                            creator: req.body.email.toLowerCase(), 
                            answers: answers})
                            
                        req.session.user = {
                        firstName: req.body.firstName,
                        email: req.body.email.toLowerCase()
                    }
                        

                        res.redirect('/polls')

                    

                }).catch(function(error) {
                        console.log(error)
                        res.send(error)
                    })


            }

            mongoAccess(db, function() {
                db.close()

            })

        }
    });

})

app.get('/new', requireLogin, function(req, res) {
    res.render('new.pug')

})

app.get('/profile', requireLogin, function(req, res) {
    if (req.user) {
        res.render('profile.pug')

    } else {
        console.log('wtf');
        res.send("If you see this, contact bigz3733@gmail.com pls. This is not supposed to be shown to users")
    }

})

app.get('/logout', function(req, res) {
    req.session.reset()
    res.redirect('/')
})

app.get('/poll/:id', function(req, res) {
    if (req.user) {
        MongoClient.connect(mongokey, function(err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('Registered user accesed poll: ' + req.params.id);

                var collection = db.collection('polls')

                var mongoAccess = function(db, callback) {
                    collection.findOne({
                        number: Number(req.params.id)
                    }, {
                        _id: 0,
                        question: 1,
                        voted: 1,
                        creator: 1,
                        answers: 1,
                        number: 1
                    }, function(error, singlepoll) {
                        if (error) {
                            console.log(error)
                        } else {
                            console.log(singlepoll)
                            if (singlepoll) {
                                res.locals.creator = singlepoll.creator
                                res.render('poll.pug', {
                                    auth: true,
                                    json: JSON.stringify(singlepoll),
                                    pollid: req.params.id,
                                    creator: singlepoll.creator,
                                    answerss: singlepoll.answers,
                                    voted: singlepoll.voted,
                                    voprosik: singlepoll.question
                                })
                            }
                        }
                    })
                }

                mongoAccess(db, function() {
                    db.close()

                })

            }

        })

    } else {

        MongoClient.connect(mongokey, function(err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('Unregistered user accesed poll: ' + req.params.id);

                var collection = db.collection('polls')

                var mongoAccess = function(db, callback) {
                    collection.findOne({
                        number: Number(req.params.id)
                    }, {
                        _id: 0,
                        question: 1,
                        voted: 1,
                        creator: 1,
                        answers: 1,
                        number: 1
                    }, function(error, singlepoll) {
                        if (error) {
                            console.log(error)
                        } else {
                            console.log(singlepoll)
                            if (singlepoll) {
                                res.locals.creator = singlepoll.creator
                                res.render('poll.pug', {
                                    auth: false,
                                    json: JSON.stringify(singlepoll),
                                    pollid: req.params.id,
                                    creator: singlepoll.creator,
                                    answerss: singlepoll.answers,
                                    voted: singlepoll.answers
                                })
                            }

                        }
                    })
                }

                mongoAccess(db, function() {
                    db.close()

                })

            }

        })
    }

})

app.post('/deletepoll', function(req, res) {
  MongoClient.connect(mongokey, function(err, db) {
      if (err) {
          console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
          console.log('Unregistered user accesed poll: ' + req.params.id);

          var collection = db.collection('polls')

          var mongoAccess = function(db, callback) {
              collection.remove({
                  number: Number(req.body.pollid)
              },true,function() {
                res.redirect('/polls')
              })
          }

          mongoAccess(db, function() {
              db.close()

          })

      }

  })

})

app.post('/voteforpoll', function(req, res) {
    if (req.body.hasOwnProperty('email')) {
        var votedArray = JSON.parse(req.body.voted)
        var answersArray = JSON.parse(req.body.answers)
        if (votedArray.indexOf(req.body.email) == -1) {
            votedArray.push(req.body.email)
            for (var y = 0; y < answersArray.length; y++) {
                if (answersArray[y].split('~')[0] == req.body.chosen) {
                    answersArray[y] = answersArray[y].split('~')[0] + '~' + (Number(answersArray[y].split('~')[1]) + 1)
                }
            }
            MongoClient.connect(mongokey, function(err, db) {
                if (err) {
                    console.log('Unable to connect to the mongoDB server. Error:', err);
                } else {
                    console.log('Registered user accesed poll:');

                    var collection = db.collection('polls')

                    var mongoAccess = function(db, callback) {
                        collection.update({
                            number: Number(req.body.pollid)
                        }, {
                            $set: {
                                voted: votedArray,
                                answers: answersArray
                            }
                        }, function() {
                            res.redirect('/poll/' + req.body.pollid)
                        })

                    }

                    mongoAccess(db, function() {
                        db.close()

                    })

                }

            })
        } else {
            //Author already voted
            MongoClient.connect(mongokey, function(err, db) {
                if (err) {
                    console.log('Unable to connect to the mongoDB server. Error:', err);
                } else {
                    console.log('Connection established through direct mongoDB driver');

                    var collection = db.collection('polls')

                    var mongoAccess = function(db, callback) {
                        collection.find({
                            creator: req.body.email
                        }, {
                            _id: 0,
                            question: 1,
                            creator: 1,
                            number: 1
                        }).sort({_id: -1}).toArray().then(function(snap) {
                            if (snap) {
                                console.log(snap)

                                req.user = req.user
                                req.session.user = req.user

                                res.redirect('/polls?error=' + req.body.voprosik)
                            }

                        }).catch(function(error) {
                            console.log(error)
                        })

                    }

                    mongoAccess(db, function() {
                        db.close()
                    })

                }
            });

        }

    } else {
        //else if noname is voting
        var answersArray = JSON.parse(req.body.answers)
            for (var y = 0; y < answersArray.length; y++) {
                if (answersArray[y].split('~')[0] == req.body.chosen) {
                    answersArray[y] = answersArray[y].split('~')[0] + '~' + (Number(answersArray[y].split('~')[1]) + 1)
                }
            }
            MongoClient.connect(mongokey, function(err, db) {
                if (err) {
                    console.log('Unable to connect to the mongoDB server. Error:', err);
                } else {
                    console.log('Registered user accesed poll:');

                    var collection = db.collection('polls')

                    var mongoAccess = function(db, callback) {
                        collection.update({
                            number: Number(req.body.pollid)
                        }, {
                            $set: {
                                answers: answersArray
                            }
                        }, function() {
                            res.redirect('/poll/' + req.body.pollid)
                        })

                    }

                    mongoAccess(db, function() {
                        db.close()

                    })

                }

            })


}})


app.post('/addanswer',function(req,res) {
  var votedArray = JSON.parse(req.body.voted)
  var answersArray = JSON.parse(req.body.answers)
  if (votedArray.indexOf(req.body.email) == -1) {
      votedArray.push(req.body.email)
      answersArray.push((req.body.extra).trim()+'~1')
      MongoClient.connect(mongokey, function(err, db) {
          if (err) {
              console.log('Unable to connect to the mongoDB server. Error:', err);
          } else {
              console.log('Registered user accesed poll:');

              var collection = db.collection('polls')

              var mongoAccess = function(db, callback) {
                  collection.update({
                      number: Number(req.body.pollid)
                  }, {
                      $set: {
                          voted: votedArray,
                          answers: answersArray
                      }
                  }, function() {
                      res.redirect('/poll/' + req.body.pollid)
                  })

              }

              mongoAccess(db, function() {
                  db.close()

              })

          }

      })
  } else {
      //Author already voted
      MongoClient.connect(mongokey, function(err, db) {
          if (err) {
              console.log('Unable to connect to the mongoDB server. Error:', err);
          } else {
              console.log('Connection established through direct mongoDB driver');

              var collection = db.collection('polls')

              var mongoAccess = function(db, callback) {
                  collection.find({
                      creator: req.body.email
                  }, {
                      _id: 0,
                      question: 1,
                      creator: 1,
                      number: 1
                  }).sort({_id: -1}).toArray().then(function(snap) {
                      if (snap) {
                          console.log(snap)

                          req.user = req.user
                          req.session.user = req.user

                          res.redirect('/polls?error=' + req.body.voprosik)
                      }

                  }).catch(function(error) {
                      console.log(error)
                  })

              }

              mongoAccess(db, function() {
                  db.close()
              })

          }
      });

  }
})

app.listen(process.env.PORT);
