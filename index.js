const express = require('express')
const dotenv = require('dotenv').config()
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const multer = require('multer')
const PORT = process.env.PORT || 12000
const app = express()


app.use(cors({
    origin: 'http://localhost:3000',
    //origin:['https://nedifoods.co.uk']
    credentials:true,
}))



const  {UserRouter } = require('./routes/user.js') 
const  {CommentRouter } = require('./routes/comment.js')  

// Mount webhook before express.json for raw body


const User = require('./models/User.js')

const cookieParser = require('cookie-parser');//requirement for authentication


const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary')

// const commentsModel = require('./models/comments/Comments.js')



app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'))
app.use('/auth', UserRouter)
app.use('/comments', CommentRouter)



mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection failed:', err));

//ONLINE UPLOAD CLOUDINARY
// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.API_KEY,
//   api_secret: process.env.API_SECRET
// });

// const storage = new CloudinaryStorage({
//   cloudinary:cloudinary,
//   params:{
//     folder: 'nedifoods',
//     allowed_formats: ['jpg', 'png', 'jpeg']
//   }
// })

//OFFLINE UPLOAD
const storage = multer.diskStorage({
  destination:(req, file, cb) => {
    cb(null, 'public/images')
  },
  filename:(req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
  }
})
const uploadfile = multer({
  storage:storage
})

//routes
app.post('/sendinfo', uploadfile.single('file'), async(req, res) => {
  try{
    const {description} = req.body
    const image = req.file?.filename || ""

    const newentry = await ShareModel.create({
      description,
      image
    })

    if (!image) {
      return res.status(404).send({ message: 'Image not found' });
    }

    res.json(newentry)
    console.log("req.body:", req.body); // 👈 Add this
    console.log("req.file:", req.file);

  }
  catch (error){
    console.error(error)
    res.status(500).json({message: 'Server Error'})
  }
})

//----------------------------------------------------------------------
//SEARCH FUNCTIONALITY
app.get('/products', async(req, res) => {
  const search = req.query.search || ''

  try{
    const products = await Products.find({
      name: { $regex: search, $options: 'i'} //case insensitive match
    })

    res.json(products)
  }
  catch(error){
    res.status(500).json({error: 'Server error'})
  }
})


// SEARCH FUNCTIONALITY -- GET /search?q=rice
app.get("/search", async (req, res) => {
  const { q } = req.query;
  try {
    const results = await Products.find({
      productname: { $regex: q, $options: "i" } // case-insensitive match
    });
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


//TRIAL CATGEORIES NAVIGATION ROUTE
app.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// app.get('/products', async (req, res) => {
//   const { category, subcategory } = req.query;

//   try {
//     let query = {};
//     if (category) query.category = category;
//     if (subcategory) query.subcategory = subcategory;

//     const products = await Product.find(query);
//     res.json(products);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

//-------------FEEDS API---------------------

app.get('/proxy', async(req, res) => {
  try{
    const response = await axios.get('https://dummyjson.com/quotes')
    res.json(response.data) 
  }catch(error){
    res.status(500).json({error: 'External API error'})
  }
  })


app.listen(process.env.PORT, () => {
    console.log('SERVER RUNNING ON PORT ' + process.env.PORT)
})
