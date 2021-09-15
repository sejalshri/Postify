require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const path =  require("path");
const https = require("https");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require('lodash');
const encrypt = require('mongoose-encryption');
const DB_PWD = process.env.DB_PWD;

const app = express();
app.use(bodyParser.urlencoded({
	extended:true
}))
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(express.static("public/"));
app.use(express.urlencoded({ extended: true }));
console.log(process.env.SECRET);
mongoose.connect("mongodb+srv://Sejalshri:"+process.env.DB_PWD+"@cluster0.vko73.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema=new mongoose.Schema({
    username: String,
    email: String,
    password: String
});
userSchema.plugin(encrypt,{secret: process.env.SECRET,encryptedFields:["password"]});
const User = mongoose.model("User", userSchema);

app.get("/",function(req,res){
	res.render("register");
})
app.get("/login",function(req,res){
	res.render("login");
})
app.post("/register",function(req,res){
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
});

app.listen(process.env.PORT || 3000, function (req, res) {
    console.log("Server started at port 3000");
  });