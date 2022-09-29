const express = require('express');
const app = express();
const port = 3000;
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://admin:admin@quizmanagerdb.rz4fngv.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const { ObjectId } = require('mongodb');
const saltRounds = 10;
const path = require('path');
const TOKEN_SECRET = "50aac40ffdbb308546d21c1835dd13c6e4ceb2839f1ecac0f09cfacad67a3c63221e074a7f8cf2c811676cc3222629545568e96a75fda9dbb5bf97fc4892e58e"
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const e = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { rejects } = require('assert');
const { restart } = require('nodemon');
const favicon = require('serve-favicon');

app.use(express.static('public'));    // easy file access
app.use(express.static('html'));    // easy file access
app.use(favicon(path.join(__dirname + '/public/assets/favicon.ico')));    // gives question icon on every page
app.use(cookieParser());    // parsing of client cookies
app.use(bodyParser.json());   // parsing of body data
app.use(bodyParser.urlencoded({ extended: true }));   // body parser from url

const PERMS = {   // permissions for users
  ADMIN: "EDIT",
  CONTRIBUTOR: "VIEW",
  USER: "RESTRICTED"
};


client.connect(err => {
//config of server
  const collectionUsers = client.db('users').collection('users');   // collection of users
  const collectionQuizzes = client.db('quizzes').collection('quizzes');   // collection of quizzes

  // config database with 'known_users.json'
  var known_users = require('./known_users.json');
  known_users.forEach(user => {
    collectionUsers.findOne({login: user.login}, (err, result) => {   // if the user exists nothing needs to happen
      if (!err) {
        if (!result) {
          bcrypt.hash(user.password, saltRounds, (err, hash) => {   // hash pw for increased security
            if (!err) {
              user.password = hash
              // puts user into database
              collectionUsers.insertOne(user, (err, result) => { if (err) console.log('Could not put user into collection of users')});
            }
            else {
              console.log('Failed to hash password');
              console.log(err);
            }
          });
        }
      }
      else {
        console.log('Error in collection user');
      }
    });
  });
  console.log('Known users configured');

  // Start the server
  app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
  });

//Part2

  // Login Page
  app.get('/login', authenticateToken, (req, res) => {
    if (!req.user) {
      res.sendFile(path.join(__dirname + '/html/login.html'));
    }
    else {
      res.redirect('/');    // Redirect to home page if user is logged in
    }
  });

  // Home Page
  app.get('/', authenticateToken, (req, res) => {
    if (req.user) {
      res.sendFile(path.join(__dirname + '/html/home.html'));
    }
    else {    // user not logged in so return the login page
      res.redirect('/login');
    }
  });

  // Profile Page
  app.get('/profile', authenticateToken, (req, res) => {
    if (req.user) {
      res.sendFile(path.join(__dirname + '/html/profile.html'));
    }
    else {    // user not logged in so return the login page
      res.redirect('/login');
    }
  });

  // Quizzes Page
  app.get('/quizzes', authenticateToken, (req, res) => {
    if (req.user) {
      res.sendFile(path.join(__dirname + '/html/quizzes.html'));
    }
    else {    // user not logged in so return the login page
      res.redirect('/login');
    }
  });

 // part3 quizzes

  // gets the details of the quiz
  app.get('/service/get-quiz-details', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      if (req.query.id) {   // if ID was passed to the server
        console.log('Request recieved to get information of quiz: ' + req.query.id);
        if (hasHigherPerms(req.permissions)) {
          // find quiz with the ID requested
          collectionQuizzes.findOne({_id: ObjectId(req.query.id)}, (err, result) => {
            if (!err) {
              if (result) {
                response = {
                  status: 'success',
                  body: result
                }
                res.json(response);
              }
              else {
                console.log('Quiz doesnt exist');
                res.status(401).json(response);
              }
            }
            else {
              console.log('Quiz details failed: ' + req.body.id);
              res.status(500).json(response);
            }
          });
        }
        else {
          console.log('Permissions invalid to get quiz details');
          res.status(403).json(response);
        }
      }
      else {
        console.log('ID not provided');
        res.status(401).json(response);
      }
    }
    else {
      console.log('User not logged in');
      res.status(401).json(response);
    }
  });

  // get available quizzes
  app.get('/service/get-quizzes', authenticateToken, async (req, res) => {
    if (req.user) {
      var htmlString = '';

      await collectionQuizzes.find().forEach((doc) => {   // await to load full html string
        htmlString += '<div class="card">';    // anchor tag for quiz
        htmlString += `<h3 class="quiz-title"><a href="/quiz?id=${doc._id}">${doc.name}</a></h3>`;   // title of quiz
        if (hasHigherPerms(req.permissions)) {   // if permissions are there add another button
          htmlString += `<a class="btn middle-btn quiz-edit" href="/new-quiz/${doc._id}">Edit</a>`;
        }
        if (isAdmin(req.permissions)) {   // add delete button if user is an admin
          htmlString += `<a class="btn middle-btn quiz-delete" data-href="/service/delete-quiz?id=${doc._id}">Delete</a>`;
        }
        htmlString += `<p>${doc.date}</p>`;
        htmlString += '</div>';
      });

      res.send(htmlString);
    }
    else {    // user not logged in so return the login page
      res.redirect('/login');
    }
  });

  // edit an existing quiz
  app.get('/new-quiz/:id', authenticateToken, (req, res) => {
    if (req.user) {
      if (hasHigherPerms(req.permissions)) {    //contributor or admin
        res.sendFile(path.join(__dirname + '/html/new-quiz.html'));
      }
      else {
        console.log('Permissions inadequate to edit quiz')
        res.redirect('/');
      }
    }
    else {    // user not logged in so return the login page
      console.log('No user logged in');
      res.redirect('/login'); //sends user to login page
    }
  });

  // get quiz
  app.get('/quiz', authenticateToken, (req, res) => {
    if (req.user && req.query.id) {
      res.sendFile(path.join(__dirname + '/html/quiz.html'));
    }
    else {
      res.redirect('/login');
    }
  });

  // create quiz
  app.get('/new-quiz', authenticateToken, (req, res) => {
    if (req.user) {
      if (isAdmin(req.permissions)) {
        res.sendFile(path.join(__dirname + '/html/new-quiz.html'));
      }
      else {
        res.redirect('/');
      }
    }
    else {
      res.redirect('/login');
    }
  });

  // get questions and title for quiz
  app.get('/service/quiz-questions', authenticateToken, async (req, res) => {
    if (req.user) {
      if (req.query.id) {
        // Find a quiz with the id requested
        collectionQuizzes.findOne({_id: ObjectId(req.query.id)}, async (err, result) => {
          if (!err) {
            if (result) {
              var questions = result.questions;
              await questions.forEach((q) => {
                delete q["answer"];   // delete answers from each question
                if (q.answers) {
                  shuffle(q.answers);   // randomise order of array
                }
              });
              res.json({status: 'success', questions: questions, title: result.name});
            }
            else {
              console.log('Quiz not found in quizzes collection');
              res.status(401).json({status: 'failed'});
            }
          }
          else {
            console.log('Query on quizzes collection failed');
            res.status(500).json({status: 'failed'})
          }
        });
      }
      else {
        console.log('ID not provided');
        res.status(401).json({status: 'failed'});
      }
    }
    else {
      console.log('Denied permission to view quizzes collection');
      res.status(403).json({status: 'failed'});
    }
  });

  // delete a quiz
  app.post('/service/delete-quiz', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      if (req.query.id) {
        var quizId = req.query.id;
        console.log(`Received request to delete quiz: ${quizId}`);
        if (isAdmin(req.permissions)) {
          // delete quiz found by ID requested
          collectionQuizzes.deleteOne({_id: ObjectId(quizId)}, (err, result) => {
            if (!err) {
              console.log(`Delete quiz: ${quizId}`);
              response.status = 'success';
              res.status(200).json(response);
            }
            else {
              console.log(`Failed to delete quiz: ${quizId}`);
              res.status(500).json(response);
            }
          });
        }
        else {    // user not an admin
          console.log('Permissions inavlid to delete quiz')
          res.status(403).json(response);
        }
      }
      else {    // ID not provided
        console.log('ID not provided to delete');
        res.status(401).json(response);
      }
    }
    else {    // user not logged in
      console.log('User not logged in');
      res.status(401).json(response);
    }
  });

  // submit answers
  app.post('/service/submit-answers', authenticateToken, (req, res) => {
    if (req.user) {
      if (req.query.id && req.body.answers && req.body.answers instanceof Array) {
        // find a quiz by ID passed
        collectionQuizzes.findOne({_id: ObjectId(req.query.id)}, async (err, result) => {
          if (!err) {
            if (result) {
              var correctAnswers = 0;
              await req.body.answers.forEach((ans, index) => {    // for inputted answer compare to actual answer
                if (ans.toLowerCase().trim() === result.questions[index].answer.toLowerCase().trim()) {
                  correctAnswers++;
                }
              });
              res.json({status: 'success', correctAnswers: correctAnswers});
            }
            else {
              console.log('Quiz not found in quizzes collection');
              res.status(401).json({status: 'failed'});
            }
          }
          else {
            console.log('Query on quizzes collection failed');
            res.status(500).json({status: 'failed'})
          }
        });
      }
      else {
        console.log('ID or body array not provided');
        res.status(401).json({status: 'failed'});
      }
    }
    else {
      console.log('Denied permission to submit answers');
      res.status(403).json({status: 'failed'});
    }
  });

  // create or update a quiz
  app.post('/service/create-quiz', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      if (isAdmin(req.permissions)) {   // makes sure that user is admin
        console.log('Request received to add or update a quiz in collection quizzes')
        if (!req.body.name.replace(/\s/g, '').length || !req.body.questions || !req.body.date || !req.body.questions instanceof Array) {
          console.log("Details were not all provided");
          res.json(response);
          return;
        }
        var quiz = {
          name: req.body.name,
          questions: req.body.questions,
          date: req.body.date,
          owner: req.user
        };
        if (req.body._id) {
          quiz._id = ObjectId(req.body._id);
        }
        if (req.body.existingQuiz) {
          // update a quiz based on ID
          collectionQuizzes.replaceOne({_id: quiz._id}, quiz, (err, result) => {
            if (!err) {
              console.log('Updated quiz successfully in collection quizzes ');
              response.status = 'success';
              res.json(response);
              return;
            }
            else {
              console.log('Error updating existing quiz into collection quizzes ');
              console.log(err);
              res.json(response);
              return;
            }
          });
        }
        else {
          // insert quiz if the request states its a new one
          collectionQuizzes.insertOne(quiz, (err, result) => {
            if (!err) {
              console.log('Added quiz successfully to collection quizzes');
              response.status = 'success';
              res.json(response);
              return;
            }
            else {
              console.log('Error inserting new quiz into collection quizzes');
              console.log(err);
              res.json(response);
              return;
            }
          });
        }
      }
      else {    // user does not have permissions
        console.log('Permissions Invalid. Unable create quiz');
        res.status(403).json(response);
      }
    }
    else {    // user not logged in return permission denied
      console.log('User not logged in. Unable create quiz');
      res.status(401).json(response);
    }
  });

//part 4 User

  // get username of user logged in
  app.get('/service/get-username', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      response = {
        status: 'success',
        user: req.user
      }
      res.json(response);
    }
    else {
      res.status(403).json(response);
    }
  });

  // get user permissions
  app.get('/service/get-permissions', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      response = {
        status: 'success',
        permissions: req.permissions
      }
      res.json(response);
    }
    else {
      res.status(403).json(response);
    }
  });

  // login User
  app.post('/login-user', (req, res) => {
    const login = req.body.login
    const user = { name: login };

    if (!user || !req.body.password) {
      return res.status(422).json({status: 'failed'});
    }

    // find the user in database
    collectionUsers.findOne({login: login}, (err, result) => {
      if (!err) {
        if (result) {
          // compare the hashed password
          bcrypt.compare(req.body.password, result.password, (err, compareResult) => {
            if (!err) {
              if (compareResult) {
                console.log('User is logged in as: ' + user.name);
                const accessToken = jwt.sign(user, TOKEN_SECRET);   // create cookie
                res.cookie('JwtToken', accessToken, { maxAge: 253402300000000});    // send cookie to client
                res.json({ status: 'success' });
                return;
              }
              else {
                console.log('Incorrect password');
                res.status(403).json({status: 'failed'});
              }
            }
            else {
              console.log('Error when attempting to compare hashes');
              console.log(err);
              res.status(500).json({status: 'failed'});
            }
          });
        }
        else {
          console.log('User doesnt exist');
          res.status(403).json({status: 'failed'});    // permission denied
          return;
        }
      }
      else {
        console.log('Error when querying collection user');
        console.log(err);
        res.status(500).json({status: 'failed'});   // internal server error
        return;
      }
    });
  });

  // update credentials
  app.post('/service/update-user', authenticateToken, async (req, res) => {
    var response = {status: 'failed'};

    if (!req.user) {    // check user has been authenticated
      console.log('No user logged in');
      res.status(401).json(response);
      return;
    }

    if (!req.body.username || !req.body.password || !req.body.passwordRepeat) {   // check all data is provided
      console.log('Not all data provided to server');
      res.status(500).json(response);
      return;
    }

    if (req.body.password !== req.body.passwordRepeat) {    // check passwords match
      console.log('Passwords do not match');
      res.status(406).json(response);
      return;
    }

    if (req.body.username !== req.user) {   // requesting name change
      // check if user exists already
      var existingUser = await collectionUsers.findOne({login: req.body.username});
      if (existingUser) {   // user already exists with the same name
        console.log('Could not change user "' + req.user + '" to "' + req.body.username + '" since name is taken');
        res.status(409).json(response);
        return;
      }
    }

    // hash the password
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) {
        console.log('Failed to hash password');
        res.status(500).json(response);
        return;
      }

      if (hash) {
        // update the user
        collectionUsers.updateOne({login: req.user}, {
          $set: {
            login: req.body.username,
            password: hash
          }
        }, (err, result) => {
          if (err) {
            console.log('Failed to save user information for : ' + req.user);
            res.status(500).json(response);
            return;
          }
          else {
            res.clearCookie('JwtToken', {maxAge: 0});   // delete the cookie so the user is taken to the login page
            console.log('Created new user: ' + req.body.username);
            response.status = 'success';
            res.json(response);
          }
        });
      }
      else {
        console.log('Hash password failed');
        res.status(500).json(response);
        return;
      }
    });
  });

  // logout the user
  app.post('/logout', authenticateToken, (req, res) => {
    console.log('Request recieved to delete token cookie');
    res.clearCookie('JwtToken', {maxAge: 0});   // delete the cookie
    res.status(200).json({status: 'success'});
  });

//part5 user auth

  // authenticate user and permissions of user
  function authenticateToken(req, res, next) {
    const token = req.cookies.JwtToken;   // get JWT from cookies

    if (token == null) return next();    // no token provided

    // verify token
    jwt.verify(token, TOKEN_SECRET, (err, user) => {
      if (!err) {
        // find user in database
        collectionUsers.findOne({login: user.name}, (err, result) => {
          if (!err) {
            if (result) {
              req.permissions = result.permissions;
              req.user = user.name;
              return next();
            }
            else {    // user doesn't exist
              console.log(`User doesn't exist in collection user: ${user.name}`);
              res.clearCookie('JwtToken', {maxAge: 0});   // delete the cookie
              return res.redirect('/login');
              // return res.status(403);
            }
          }   // internal server error
          else {
            console.log('Internal server error trying to find user in collection users');
            return res.status(500);
          }
        });
      }
      else {
        console.log('Token not be verified, is user logged in');
        return next();   // No user logged in
      }
    });
  }

//part6 Functions

  // shuffle array
  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // while there remain elements to shuffle
    while (0 !== currentIndex) {

      // pick a remaining element
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // swap it with the current element
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  // check user has contributor or admin permissions
  function hasHigherPerms(perms) {
    if (perms === PERMS.ADMIN || perms === PERMS.CONTRIBUTOR) {
      return true;
    }
    else {
      return false;
    }
  }

  // check if the user has admin
  function isAdmin(perms) {
    if (perms === PERMS.ADMIN) {
      return true;
    }
    else {
      return false;
    }
  }
});
