const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
// const nodemailer = require('nodemailer')
dotenv.config()

const User = mongoose.model('users')
const usersInfo = mongoose.model('usersinfos')

// const Counter = mongoose.model('counters')

const router = express.Router()
router.use(express.json())
// const transporter = nodemailer.createTransport(transportOptions);

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

const { ObjectId } = require('mongoose').Types

router.get('/api/protected/members', async (req, res) => {
  try {
    const result = await usersInfo.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'usersID',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $match: {
          memberCode: { $ne: '0000' }
        }
      }
    ])

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})

// Define endpoint for querying by firstName or lastName
router.get('/api/protected/members', async (req, res) => {
  const { queryParam } = req.query

  try {
    const users = await User.find({
      $or: [
        { firstName: { $regex: new RegExp(queryParam, 'i') } },
        { lastName: { $regex: new RegExp(queryParam, 'i') } }
      ]
    })

    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).send('Server Error')
  }
})

module.exports = router
