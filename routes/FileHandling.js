const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const token = req.session.token
  if (token == null) {
    console.log('Token is missing')
    // res.redirect(process.env.CLIENT_URL + "/");
    return res.sendStatus(401)
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}
router.use('/api/protected', authenticateToken)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/contracts/pdf') // Specify the directory where you want to store the files
  },
  filename: (req, file, cb) => {
    const memberID = req.params.memberID
    const date = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '') // Format date
    const filename = `${memberID}_(${date})_contract${path.extname(file.originalname)}`
    cb(null, filename)
  }
})

const sign_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/contracts/signatures') // Specify the directory where you want to store the files
  },
  filename: (req, file, cb) => {
    const memberID = req.params.memberID
    const date = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '') // Format date
    const filename = `${memberID}_(${date})_signature${path.extname(file.originalname)}`
    cb(null, filename)
  }
})

const upload = multer({ storage })
const upload_sign = multer({ storage: sign_storage })

router.post('/api/upload/contract/:memberID', authenticateToken, upload.single('upload'), (req, res) => {
  try {
    if (!req.file) {
      // No file provided
      return res.status(400).send('No file uploaded')
    }

    // Handle the file upload here, e.g., save the file path to a database
    const filePath = req.file.path
    console.log('File saved at:', filePath)
    res.send('File uploaded successfully')
  } catch (error) {
    console.error('Error handling contract file upload:', error)
    res.status(500).send('Internal Server Error')
  }
})

router.post('/api/upload/signature/:memberID', authenticateToken, upload_sign.single('upload'), (req, res) => {
  try {
    if (!req.file) {
      // No file provided
      return res.status(400).send('No file uploaded')
    }

    // Handle the file upload here, e.g., save the file path to a database
    const filePath = req.file.path
    console.log('File saved at:', filePath)
    res.send('File uploaded successfully')
  } catch (error) {
    console.error('Error handling signature file upload:', error)
    res.status(500).send('Internal Server Error')
  }
})

module.exports = router
