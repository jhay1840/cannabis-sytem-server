const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
// const nodemailer = require('nodemailer')
dotenv.config()

const User = mongoose.model('users')
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
