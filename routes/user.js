const express = require('express')
const bcrypt = require('bcrypt')
const User = require('../models/User.js')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')

const axios = require('axios');

dotenv.config()

const router = express.Router()


router.post('/signup', async(req, res) => {
    const {username, email, password, phone, address} = req.body
    const user = await User.findOne({email})
    if(user){
        return res.json({message:'Email already exists'})
    }
    const hashpassword = await bcrypt.hash(password, 10)
    const newuser = new User({
        username,
        email,
        password : hashpassword,
        phone,
        address
    })
    await newuser.save()
    return res.json({status:true, message:'record registered'})
})

router.post('/login', async(req, res) => {
    const {email, password} = req.body
    const user = await User.findOne({email})
    console.log(user)
    if(!user){
        return res.json({message: 'User does not exist or is not registered'})
    }

    const validpassword = await bcrypt.compare(password, user.password)
    if(!validpassword){
        return res.json({message:'password is incorrect'})
    }

    const token = jwt.sign({id: user._id}, process.env.KEY, {expiresIn:'3h'})
    res.cookie('token', token, {
    httpOnly: true,
    secure: true,       // this is important when using HTTPS (e.g., Render)
    sameSite: 'None',   // necessary when frontend and backend are on different domains
    maxAge: 36000000
    });

    res.json({status:true, message:"login succesful amigo"})
})

router.post('/forgotpassword', async(req, res) => {
    const {email} = req.body

    try{
        console.log('Request received with email:', email);
        const user = await User.findOne({email})
        if(!user){
            console.log('User not found for email:', email);
            return res.json({status: false, message:'user not registered'})
        }

        console.log('User found:', user.email);
        const token = jwt.sign({id: user._id}, process.env.KEY, {expiresIn: '5m'})
        console.log('Generated token:', token);
    
        const transporter = nodemailer.createTransport({ 
            host: process.env.EMAIL_HOST,  // e.g. mail.yourdomain.com
            port: Number(process.env.EMAIL_PORT),                     // or 587 (TLS)
            //secure: false,                 // true for 465, false for 587
            auth: {
                user: process.env.EMAIL_USER, // e.g., noreply@yourcompany.com
                pass: process.env.EMAIL_PASS  // your actual email password or SMTP token
            },
            logger:true,
            debug:true
        });

        
        var mailOptions = {
            from:  '"Nedifoods" <support@nedifoods.co.uk>',  //process.env.EMAIL_USER,
            to: email,
            subject: 'Reset password',
            text: `click on the link or copy it to your browser: https://nedifoods.co.uk/reset-password/${token}`
        }


        console.log("EMAIL_USER:", process.env.EMAIL_USER);
        console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error)
                return res.json({status:false, message: 'error sending email'})
            }else{
                return res.json({status:false, message: 'Check your email Inbox or Spam for reset link'})
            }
        });
    
    }catch(err) {
        console.log(err)
        res.json({status:false, message:'server error'})
    }
})


router.post('/reset-password/:token', async(req, res) => {
    const {token} = req.params
    const {password} = req.body
    
    try{
        const decoded = await jwt.verify(token, process.env.KEY)
        const id = decoded.id;
        const hashPassword = await bcrypt.hash(password, 10)
        await User.findByIdAndUpdate({_id: id}, {password:hashPassword})
        return res.json({status:true, message:"updated password"})
    }
    catch (error){
        console.error(error)
        return res.json("invalid token")
    }
})


//this block of code checks for user authentication. call verifyUser whereever you want to use it
const verifyUser = async (req, res, next) => {
    try{
        const token = req.cookies.token;
        if(!token){
            return res.json({status: false, message: "no token"})
        }
        const decoded = jwt.verify(token, process.env.KEY);
        req.user = decoded;
        next()
    }
    catch (error){
        return res.json(error)
    }
}


router.get('/verify', verifyUser, (req, res) => {
    return res.json({status: true, message: "authorized user"})

})

//get user details for dashboard
router.get('/dashboard', verifyUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//update user details for dashboard
router.put('/update', verifyUser, async(req, res) => {
    try{
        const {username, email, phone, address} = req.body

        const profileupdate = await User.findByIdAndUpdate(
            req.user.id,
            {username, email, phone, address},
            {new:true}
        ).select('-password')
        return res.status(200).json({status:true, message:'updated successfully', profileupdate})

    }
    catch (error){
        console.error(error)
    }
})



//logout function - delete token
router.get('/logout', verifyUser, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path:'/'
  });
  return res.json({status: true});
});


module.exports = { UserRouter:router } 
//export {router as UserRouter} 
