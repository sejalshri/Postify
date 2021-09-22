require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const path =  require("path");
const fs = require("fs");
//const https = require("https");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require('lodash');
//const encrypt = require('mongoose-encryption');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const bcrypt=require("bcrypt");
const DB_PWD = process.env.DB_PWD;
const Pusher = require('pusher');

const app = express();
app.use(bodyParser.urlencoded({
	extended:true
}))
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(express.static("public/"));
app.use(express.urlencoded({ extended: true }));


var pusher = new Pusher({
    appId: process.env.PUSHER_APPID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: 'ap2',
    encrypted: true
  });

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
//mongoose.set("useCreateIndex", true);
//mongoose.set("useFindAndModify", false);

const userSchema=new mongoose.Schema({
    username: String,
    email: String,
    password: String
});
//userSchema.plugin(encrypt,{secret: process.env.SECRET,encryptedFields:["password"]});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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
    /**Posts.find({},function(err,foundposts){
        if(err){
            console.log(err);
        }
        res.render("result",{items:foundposts});
    })**/

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
app.get("/register",function(req,res){
    res.render("register",{message:""});
})
app.get("/login",function(req,res){
	res.render("login",{message:""});
})

/**app.post("/login",function(req,res){
    User.findOne({email:req.body.email},function(err,foundUser){
        console.log(foundUser);
        if(!foundUser){
            res.render("register",{message:"No Account Associated! Register first."});
        }
        else{
            res.render("home",{items:foundposts1});
        }
    })
})

app.post("/register",function(req,res){
    User.findOne({email:req.body.email},function(err,founduser){
        if(err){
            console.log(err);
        }
        if(!founduser){
            const newUser=new User({
                username:req.body.username,
                email:req.body.email,
                password:req.body.password
            });
        
            newUser.save(function(err){
                if(err){
                    console.log(err);
                }
                else{
                    console.log("successful");
                }
            });
            res.render("home");
        }
        else{
            res.render("login",{message:"Existing User! Try to login"});
        }
    })
});**/
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
app.post("/comment", function(req, res){
    console.log(req.body.comment);
    console.log("hello");
    var newComment = {
      comment: req.body.comment
    }
    pusher.trigger('Postify', 'new_comment', newComment);
    res.json({ created: true });
  });
/*Login-register END*/
app.listen(process.env.PORT || 3000, function (req, res) {
    console.log("Server started at port 3000");
  });