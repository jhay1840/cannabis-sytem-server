const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const { Profiler } = require('react')
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
// Middleware to authenticate the user
function authenticateTokenUser(req, res, next) {
  const token = req.session.token
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
  const token = req.session.token
  if (token == null) {
    return res.sendStatus(401) // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403) // Forbidden
    }
    req.user = user
    // Assuming the token contains a user object with a role property
    if (req.user.userRole !== 'superadmin' && req.user.userRole !== 'admin') {
      return res.sendStatus(403).send(req.user.userRole) // Forbidden
    }

    next()
  })
}

router.use('/api/user/protected/', authenticateTokenUser)
router.use('/api/protected/', authenticateToken)

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
router.get('/api/user/protected/members', async (req, res) => {
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

// New endpoint for searching by first name and last name
router.get('/api/protected/members/search', async (req, res) => {
  try {
    const { name } = req.query

    if (!name) {
      return res.status(201).json({ error: 'Please provide a search query.' + name })
    }

    const searchQuery = {
      $or: [{ firstName: { $regex: new RegExp(name, 'i') } }, { lastName: { $regex: new RegExp(name, 'i') } }]
    }

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
          memberCode: { $ne: '0000' },
          ...searchQuery
        }
      }
    ])

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})

// New endpoint for searching by first name and last name
router.get('/api/protected/members/searchbyid', async (req, res) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(201).json({ error: 'Please provide a search query.' })
    }

    const searchQuery = {
      $or: [{ memberCode: { $regex: new RegExp(id, 'i') } }]
    }

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
          memberCode: { $ne: '0000' },
          ...searchQuery
        }
      }
    ])

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})
// fetch member Profile
router.get('/api/protected/members/:memberCode', async (req, res) => {
  try {
    const memberCode = req.params.memberCode

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
          memberCode: memberCode // Match the member code from the request URL
        }
      }
    ])

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})
router.get('/api/user/protected/members/:memberCode', async (req, res) => {
  try {
    const memberCode = req.params.memberCode

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
          memberCode: memberCode // Match the member code from the request URL
        }
      }
    ])

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
})
module.exports = router
