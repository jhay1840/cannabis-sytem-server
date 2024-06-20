const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')
const htmlPdf = require('html-pdf')
const crypto = require('crypto')

dotenv.config()

const User = mongoose.model('users')
const Settings = mongoose.model('settings')

const router = express.Router()
router.use(express.json())

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

// Route to get current settings
router.get('/api/protected/getSettings', async (req, res) => {
  try {
    const settings = await Settings.findOne()
    res.json(settings || {})
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error })
  }
})

// Route to update settings
router.put('/api/protected/updateSettings', async (req, res) => {
  const { appName, idTypes, estimatedConsumption, cannabisCategories, cannabisTypes } = req.body
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }
    settings.appName = appName

    settings.idTypes = idTypes
    settings.estimatedConsumption = estimatedConsumption
    settings.cannabisCategories = cannabisCategories
    settings.cannabisType = cannabisTypes

    await settings.save()
    res.json({ message: 'Settings updated successfully', settings })
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error })
  }
})

// get cannabis categories
router.get('/api/protected/getCannabisCategories', async (req, res) => {
  try {
    const settings = await Settings.findOne({}) // Assuming you have only one settings document
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' })
    }
    const cannabisCategories = settings.cannabisCategories
    const cannabisTypes = settings.cannabisType
    res.json({ categories: cannabisCategories, types: cannabisTypes })
  } catch (err) {
    console.error('Error fetching cannabis categories:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})
// get idTypes categories
router.get('/api/protected/getMemberOptions', async (req, res) => {
  try {
    const settings = await Settings.findOne({}) // Assuming you have only one settings document
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' })
    }
    const idTypes = settings.idTypes
    const estimatedConsumption = settings.estimatedConsumption

    res.json({ idTypes: idTypes, estimatedConsumption: estimatedConsumption })
  } catch (err) {
    console.error('Error fetching idTypes:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router
