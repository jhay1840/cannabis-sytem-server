const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const app = express()
const cors = require('cors')

app.use(
  cors({
    origin: ['http://localhost:3000'],
    optionsSuccessStatus: 200,
    credentials: true
  })
)
// app.use(cors());

// create model user on mongo

require('./models/userModel')
require('./models/userInfoModel')
require('./models/productModel')
require('./models/cannabisTransactionModel')
require('./models/creditsTransactionModel')

const fileRoutes = require('./routes/FileHandling')
const userRoutes = require('./routes/UserAuth')
const memberRoutes = require('./routes/MemberData')
const productRoutes = require('./routes/ProductData')
const transactionRoutes = require('./routes/TransactionData')

// add cookie session
const cookieSession = require('cookie-session')

app.get('/', (req, res) => {
  res.send('Hello')
})

app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.COOKIE_KEY],
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  })
)

// Load environment variables from .env file
dotenv.config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// Define routes
app.use('/', userRoutes)
app.use('/', fileRoutes)
app.use('/', memberRoutes)
app.use('/', productRoutes)
app.use('/', transactionRoutes)

// app.use('/', dashboardRoutes)
app.use((req, res) => {
  res.status(404).send('Sorry, the requested page could not be found')
})

// Start the server
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server started on port ${process.env.PORT || 5000}`)
})
