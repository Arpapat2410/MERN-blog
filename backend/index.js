const express = require("express")
const cors = require("cors")
const mongoose = require('mongoose')
require("dotenv").config();
const User = require("./models/User")
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken');
const { JsonWebTokenError } = require('jsonwebtoken');
const app = express()

const multer = require('multer')
const uploadMinddleware = multer({ dest: 'uploads/' })
const fs = require('fs')
const Post = require('./models/Post')
const cookieParser = require('cookie-parser')

//Connect Database
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false)
mongoose.connect(MONGODB_URI).then(err=>{
    if(!err){
        return console.log(err)
    }
    return console.log("Connected to MongooseDB")
})

//middleware
app.use(cors({ credentials: true, origin:"http://localhost:5173"}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//set static(public) folder
app.use('/uploads', express.static(__dirname +'/uploads'));


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
        jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token)=>{
            if (err) throw err;
            res.cookie("token", token).json({
                id: userDoc._id,
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

app.post("/post", uploadMinddleware.single("file") , async (req, res) => {
    // ดึงข้อมูลที่ได้จากการอัปโหลดไฟล์
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);

    // ดึงข้อมูล token จาก cookies
    const { token } = req.cookies || {};
    // ยืนยัน token และดึงข้อมูล user
    jwt.verify(token, secret, async (err, info) => {
        if (err) throw err;
        // ดึงข้อมูลจาก body ของ request
        const { title, summary, content } = req.body;
        // สร้างบทความใน MongoDB
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover: newPath,
            author: info.id,
        });
        // ส่งข้อมูลบทความที่สร้างไปให้ผู้ใช้
        res.json(postDoc);
    });
})

//get 
app.get("/post", async (req, res) => {
    try {
        const postDoc = await Post.find()
        .populate("author", ["username"])
        .sort({createdAt: - 1})
        .limit(20);
        res.status(200).json(postDoc);
    } catch (error) {
        res.status(500).json({ error: "failed to Get All Post" });
    }
})

//get by id
app.get("/post/:id", async (req, res) => {
    try {
        const postDoc = await Post.findById(req.params.id)
        .populate("author", ["username"])
        res.status(200).json(postDoc);
    } catch (error) {
        res.status(500).json({ error: "failed to Get All Post" });
    }
})

//update
app.put("/post" , uploadMinddleware.single("file"), async (req, res) => {
    let newPath = null;
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split(".");
        const ext = parts[parts.length - 1];
        newPath = path + "." + ext;
        fs.renameSync(path, newPath);
    }
    const { token } = req.cookies;
    jwt.verify(token, secret, async (err, info) => {
        if (err) throw err;
        const { id, title, summary, content } = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if (!isAuthor) {
            return res.status(400).json("เธอไม่ใช่เจ้าของบทความนะ");
        }
        await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover,
        });
        res.json(postDoc);
    });
});

//delete
app.delete('/post/:id', async(req,res)=>{
    const postId = req.params.id
    if(!postId){
        return res.status(404).json("no id provided")
    }
    if(mongoose.isValidObjectId(postId)){
        const result = await Post.deleteOne({_id:postId})
        if(result.deletedCount === 0 ){
            return res.status(404).json(`no id found ${postId}`)
        }
        res.status(202).json(`deleted id ${postId}`)
    }
    res.status(404).json('id is not object id')
})


const PORT = process.env.PORT;
app.listen(PORT, ()=>{
    console.log("Server is running on http://localhost:" + PORT);
})
