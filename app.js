//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");

//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalmongoose = require("passport-local-mongoose");


const app = express();


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(session({
  secret: 'not much of a secret.',
  resave: false,
  saveUninitialized: false,
  //cookie: { secure: true }
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secretsDB", { useNewUrlParser: true });
mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  googleId: String,
  secret: String

});
   userSchema.plugin(passportLocalmongoose);
//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:["password"]});

userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);
//const User = require('./models/user');

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());
// passport.serializeUser(function(User, done) {
//   done(null, User);
// });
//
// passport.deserializeUser(function(User, done) {
//   done(null, User);
// });
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.use(express.static("public"));

app.get("/", function(req,res){
  res.render("home");
});

app.get("/auth/google",passport.authenticate("google", { scope: ["profile"] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secret.
    res.redirect('/secrets');
  });



app.get("/login", function(req,res){
  res.render("login");
});

app.get("/register", function(req,res){

  res.render("register");
});

app.get("/secrets", function(req, res){



  User.find({"secret": {$ne: null}}, function(err, founUsers){
    if(err){
      console.log(err);
    }
    else{
      if(founUsers){
        res.render("secrets", {usersWithSecret: founUsers});
      }
    }
  });
  // if(req.isAuthenticated()){
  //   res.render("secrets");
  // }
  // else{
  //   res.redirect("login");
  // }
});
app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("login");
  }
});
app.post("/submit", function(req, res){
  const newSecret = req.body.secret;
  console.log(req.user.id);

  User.findById(req.user.id, function(err, founduser){
    if(err){
      console.log(err);
    }
    else{
      if(founduser){
        founduser.secret = newSecret;
        founduser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});
app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username},
  req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }

  });

/**
    let name = req.body.username ;
    let pass = req.body.password ;
  bcrypt.hash(pass, saltRounds, function(err, hash) {
  // Store hash in your password DB.
  const person = new User({
    name: name,
    password: hash
  });
  person.save(function(err){
    if(err){
      console.log(err);
    }else{
      res.render("secrets");
    }
  });
});
  **/




});

app.post("/login", function(req, res){

  const user = new User({
    name: req.body.username,
    password: req.body.password

  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
  /**
  let name = req.body.username ;
  let pass = req.body.password ;
  User.findOne({name : name}, function(err, find){
    if(err){
      console.log(err);
    }
    else{
      if(find){
        bcrypt.compare(pass, find.password, function(err, result) {
          if(result === true){
         res.render("secrets");
       }
});
//  if(find.password === pass){}
  }
}
});**/

});










app.listen(3000, function() {
  console.log("Server started on port 3000");
});
