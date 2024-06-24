const express = require('express')
const router = express.Router()
const multer = require('multer')
const multerS3 = require('multer-s3')
const path = require('path')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { S3Client } = require('@aws-sdk/client-s3')
const Products = mongoose.model('cannabisproducts')

// Configure AWS SDK
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

// Middleware to authenticate the user
function authenticateTokenUser(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token == null) {
    return res.sendStatus(401) // Unauthorized
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403) // Forbidden
    }
    req.user = user
    next()
  })
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token == null) {
    return res.sendStatus(401) // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403) // Forbidden
    }

    // Assuming the token contains a user object with a role property
    if (user.userRole !== 'superadmin' && user.userRole !== 'admin') {
      return res.sendStatus(403) // Forbidden
    }

    req.user = user
    next()
  })
}

router.use('/api/user/protected/', authenticateTokenUser)
router.use('/api/protected/', authenticateToken)

// Configure multer storage for S3
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,

  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname })
  },
  key: (req, file, cb) => {
    const productName = req.params.productName.replace(/\s+/g, '-').toLowerCase() // Adjust for product name
    const date = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '') // Format date
    const filename = `product-images/${productName}/${date}_${file.fieldname}${path.extname(file.originalname)}` // Include folder path
    cb(null, filename)
  }
})
const upload = multer({ storage: s3Storage })
// Configure multer storage for S3 for signature files
const signatureStorage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME, // Replace with your bucket name

  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname })
  },
  key: (req, file, cb) => {
    const memberID = req.params.memberID || req.params.productName
    const date = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '') // Format date
    const filename = `signature/${memberID}_${date}_${file.fieldname}${path.extname(file.originalname)}` // Include folder path
    cb(null, filename)
  }
})

const uploadSignature = multer({ storage: signatureStorage })

router.post('/api/upload/contract/:memberID', authenticateToken, upload.single('upload'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded')
    }
    const fileUrl = req.file.location
    console.log('File uploaded to:', fileUrl)
    res.send('File uploaded successfully')
  } catch (error) {
    console.error('Error handling contract file upload:', error)
    res.status(500).send('Internal Server Error')
  }
})

router.post('/api/upload/signature/:memberID', authenticateToken, uploadSignature.single('upload'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded')
    }
    const fileUrl = req.file.location
    console.log('Signature uploaded to:', fileUrl)
    res.send('Signature uploaded successfully')
  } catch (error) {
    console.error('Error handling signature file upload:', error)
    res.status(500).send('Internal Server Error')
  }
})

router.post(
  '/api/protected/upload/product/:productName',
  authenticateToken,
  upload.single('productImage'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded')
      }
      const fileUrl = req.file.location
      console.log('File uploaded to:', fileUrl)
      res.send(fileUrl)
    } catch (error) {
      console.error('Error handling product image file upload:', error)
      res.status(500).send('Internal Server Error')
    }
  }
)

// Endpoint for adding products
router.post('/api/protected/addProduct', async (req, res) => {
  const {
    name,
    secondBreed,
    type,
    sativa,
    thc,
    cbd,
    cbn,
    description,
    medicalDescription,
    category,
    productImageUrl,
    salePrice,
    costPrice
  } = req.body

  try {
    const createProduct = await Products.create({
      name,
      secondBreed,
      type,
      sativaPercent: sativa,
      THCpercent: thc,
      CBDpercent: cbd,
      CBNpercent: cbn,
      description,
      medDescription: medicalDescription,
      category,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
      imageURL: productImageUrl,
      salePrice,
      costPrice
    })

    res.status(201).json({ product: createProduct })
  } catch (error) {
    console.error(error) // Log the error for debugging purposes
    res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
})

// Endpoint for updating products
router.post('/api/protected/updateProduct', async (req, res) => {
  const {
    id,
    name,
    secondBreed,
    type,
    sativa,
    thc,
    cbd,
    cbn,
    description,
    medicalDescription,
    category,
    productImageUrl,
    salePrice,
    costPrice
  } = req.body

  try {
    const updatedProduct = await Products.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          name,
          secondBreed,
          type,
          sativaPercent: sativa,
          THCpercent: thc,
          CBDpercent: cbd,
          CBNpercent: cbn,
          description,
          medDescription: medicalDescription,
          category,
          lastUpdated: Date.now(),
          imageURL: productImageUrl,
          salePrice,
          costPrice
        }
      },
      { new: true } // Return the updated document
    )

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' + id })
    }

    res.status(201).json({ product: updatedProduct })
  } catch (error) {
    console.error(error) // Log the error for debugging purposes
    res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
})

module.exports = router
