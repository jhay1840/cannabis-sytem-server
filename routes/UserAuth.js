const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
// const nodemailer = require('nodemailer')
dotenv.config()

const User = mongoose.model('users')
const UserInfo = mongoose.model('userInfo')
const router = express.Router()
router.use(express.json())

/*
authenticate user
output: user 
*/
function authenticateToken(req, res, next) {
  const token = req.session.token
  if (token == null) {
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

/*
Check login details
*/
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    // Find user by email
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      console.log(user.password)
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, userRole: user.userRole }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    })

    const userRole = user.userRole
    req.session.token = token
    // res.cookie("jwt", token, { httpOnly: true });

    res.json({ token, userRole })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server Error' })
  }
})

/*
Check token and user type
*/
router.get('/api/public/user-type', (req, res) => {
  const token = req.session.token
  const isLoggedIn = 'false'
  if (token == null) {
    return res.json(isLoggedIn)
  } else {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403)
      req.user = user
      return res.json(req.user.userRole)
    })
  }
})

//---------------------------------------------------------------------------------------------
// endpoint to check if email already exist

router.post('/api/protected/check_email', async (req, res) => {
  const { email } = req.body
  try {
    // check if email already exist
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(204).json({ message: 'Email already exists' })
    }
    console.log(req.body)
    res.status(201).json({ message: 'email validated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

//---------------------------------------------------------------------------------------------
// endpoint for registering the user to database

router.post('/api/protected/register', async (req, res) => {
  const confirmationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const { firstName, lastName, password, email, idNumber, dateOfBirth, phone } = req.body
  // Hash the password
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)
  try {
    const createdUser = await User.create({
      firstName,
      lastName,
      password: hashedPassword,
      email,
      idNumber,
      dateOfBirth,
      height,
      weight,
      gender,
      mobileNumber,
      telephoneNumber,
      address1,
      address2,
      city,
      postal,
      province,
      userType: 'patient',
      patientCode,
      caregiverEmail,
      confirmationCode: confirmationCode,
      confirmed: false,
      createdAt: Date.now()
    })

    // Generate JWT token
    const token = jwt.sign({ userId: createdUser._id, userType: createdUser.userType }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    })
    req.session.token = token

    // send confirmation email
    const mailOptions = {
      from: 'hello@cannabishealth.co.za',
      to: email,
      subject: 'Cannabis health email confirmattion',
      html: `
    <h1>Confirm Your Email Address</h1>
    <p>Please click on the following link to confirm your email address:</p>
    <a href="${process.env.CLIENT_URL + '/confirm-email/' + confirmationCode}">${
        process.env.CLIENT_URL + '/confirm-email/' + confirmationCode
      }</a>
  `
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })

    res.send({ status: 'registered' })
  } catch (error) {
    res.send({ status: 'error' })
  }
})
//---------------------------------------------------------------------------------------------
// confirm email address
router.get('/api/confirm-email/:confirmationCode', (req, res) => {
  const confirmationCode = req.params.confirmationCode
  // Update the user's record to mark their email address as confirmed
  User.findOneAndUpdate({ confirmationCode: confirmationCode }, { confirmed: true }, { new: true })
    .then(updatedUser => {
      res.send('email confirmed')
    })
    .catch(err => {
      console.log(err)
    })
})
//---------------------------------------------------------------------------------------------
// Handle logout route
router.get('/logout', (req, res) => {
  try {
    // Clear session and JWT cookie
    req.session = null
    res.clearCookie('jwt')
    // res.redirect(process.env.CLIENT_URL + "/");
    res.send('logged out')
  } catch (error) {
    console.log(error)
  }
})

module.exports = router
