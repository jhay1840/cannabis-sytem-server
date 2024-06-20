const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config()

const User = mongoose.model('users')
const usersInfo = mongoose.model('usersinfos')
const Product = mongoose.model('cannabisproducts')

// const Counter = mongoose.model('counters')

const router = express.Router()
router.use(express.json())
const { ObjectId } = require('mongoose').Types

/*
authenticate user
output: user 
*/
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

// router.get('/api/protected/cannabisProducts', async (req, res) => {
//   try {
//     const products = await Product.find().sort({ createdAt: -1 })
//     res.json(products)
//   } catch (err) {
//     res.status(500).json({ message: err.message })
//   }
// })

// GET all products or search products by name
router.get('/api/protected/cannabisProducts', async (req, res) => {
  try {
    const { search } = req.query // Get the search query from the request query parameters

    let products
    if (search && search.trim() !== '') {
      // If there's a search query, perform case-insensitive search on product name
      const searchRegex = new RegExp(search.trim(), 'i')
      products = await Product.find({ name: { $regex: searchRegex } }).sort({ createdAt: -1 })
    } else {
      // Otherwise, fetch all products
      products = await Product.find().sort({ createdAt: -1 })
    }

    res.json(products)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// fetch product
router.get('/api/protected/cannabisProducts/:productCode', async (req, res) => {
  try {
    const productCode = req.params.productCode
    const product = await Product.findOne({ _id: productCode })

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    res.json(product)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// delete product
router.delete('/api/protected/cannabisProducts/:productCode', async (req, res) => {
  const { productCode } = req.params
  try {
    // Find the product by its code and delete it
    const deletedProduct = await Product.findOneAndDelete({ _id: productCode })
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(200).json({ message: 'Product deleted successfully', deletedProduct })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
