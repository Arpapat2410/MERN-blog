const express = require("express")
const cors = require("cors")
const mongoose = require('mongoose')
require("dotenv").config();
const User = require("./models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const app = express()

//middleware
app.use(cors({ credentials: true, origin:"http://localhost:5173"}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Connect Database
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false)
mongoose.connect(MONGODB_URI).then(err=>{
    if(!err){
        return console.log(err)
    }
    return console.log("Connected to MongooseDB")
})

app.get("/",(req,res)=>{
    res.send("<h1>This is a RESTful API for MREN SE NPRU Blog</h1>")
})

//User register
const salt = bcrypt.genSaltSync(10);
app.post("/register" , async(req,res)=>{
    const {username,password} = req.body;
    try {
        const userDoc = await User.create({
            username ,
            password : bcrypt.hashSync(password,salt)
        })
        res.json(userDoc)
    } catch (error) {
        console.log((error));
        res.status(400).json(error)
    }
})

//User Login
const secret = process.env.SECRET
app.post("/login",async (req, res) => {
    //เป็นการ Destructuring Object
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username })
    const isMatchedPassword = bcrypt.compareSync(password, userDoc.password);
    if (isMatchedPassword) {
        //logged in
        jwt.sign({ username, id: userDoc }, secret, {}, (err, token)=>{
            if (err) throw err;
            res.cookie("token", token).json({
                id:userDoc.id,
                username,
                password,
            })
        })
    } else {
        res.status(400).json("wrong credentials")
    }
})

//logout
app.post("/logout",async (req, res) => {
    res.cookie("token","").json("ok")
})


const PORT = process.env.PORT;
app.listen(PORT, ()=>{
    console.log("Server is running on http://localhost:" + PORT);
})
