require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const path =  require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require('lodash');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const bcrypt=require("bcrypt");
const DB_PWD = process.env.DB_PWD;
const GoogleStrategy = require("passport-google-oauth20").Strategy;


const app = express();
app.use(bodyParser.urlencoded({
	extended:true
}))
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(express.static("public/"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
})
);
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://Sejalshri:"+process.env.DB_PWD+"@cluster0.vko73.mongodb.net/userDB?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema=new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    googleId:String

});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/posts",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOne({
        googleId: profile.id
    },function(err,found){
        if(err){
            console.log(err);
        }
        if(!found){
            const user=new User({
                username:profile.displayName,
                googleId:profile.id
            })
            user.save(function(err){
                if(err){
                    console.log(err);
                }
                else{
                    console.log("Successfull");
                }
            })
            active=profile.displayName;
            console.log(active);
            return cb(err,user);
        }
        else{
            active=profile.displayName;
            console.log(active);
            return cb(err,found);
        }
    })
  }
));

const postSchema=new mongoose.Schema({
    username:String,
    date:String,
    title: String,
    description: String,
    comments:
    [{
       user: String,
       comment:String
    }],
    img:
    {
        data: Buffer,
        contentType: String
    }
});
const Posts = mongoose.model("Posts", postSchema);

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, path.extname(file.originalname) + '-' + Date.now())
    }
});
 
var upload = multer({ storage: storage });

app.get("/create",function(req,res){
    Posts.find({username:active},function(err,found){
        res.render("create",{message:"",items:found});
    })
})
app.post('/create', upload.single('image'), (req, res) => {
    const d = new Date();
    const newPost=new Posts({
        username:active,
        date:"~ "+d.getDate()+"/"+d.getMonth()+"/"+d.getFullYear()+"-"+d.getHours()+":"+d.getMinutes(),
        title: req.body.title,
        description: req.body.description,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    })
    newPost.save(function(err){
        if(err){
            console.log(err);
        }
        else{
            console.log("successful");
            res.redirect("/create");
        }
    });
})
var foundposts1="";
app.get("/",function(req,res){
    Posts.find({},function(err,foundposts){
        if(err){
            console.log(err);
        }
        if(req.isAuthenticated()){
            res.render("home",{nav2:"MyProfile",nav2h:"create",nav3:"Logout",nav3h:"logout",items:foundposts});
        }
        else{
        res.render("home",{nav2:"Login",nav2h:"login",nav3:"Register",nav3h:"register",items:foundposts});
    }
    })
    });

/*LOGIN-REGISTER*/
app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
);

app.get('/auth/google/posts', 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });


app.get("/register",function(req,res){
    res.render("register",{message:""});
})
app.get("/login",function(req,res){
	res.render("login",{message:""});
})
var active="";
app.post("/register",function(req,res){
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err) {
            res.render("register",{message:err});
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/");
            })
        }
    })
})

app.post("/login",function(req,res){
    const user = new User({
        username:req.body.username,
        password:req.body.password
    })
    req.login(user,function(err){
        if(err){
            res.render("login",{message:err});
        }
        else{
            passport.authenticate("local")(req,res,function(){
                active=user.username;
                console.log(active);
                res.redirect("/");
            })
        }
    })

    })
app.get("/logout",function(req,res){
    active="";
    req.logout();
    res.redirect("/");
})
app.listen(process.env.PORT || 8000, function (req, res) {
    console.log("Server started at port 8000");
  });