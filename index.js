const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const app = express()
const cors = require('cors')

app.use(
  cors({
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200,
    credentials: true
  })
)
app.options('/login', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL)
  res.setHeader('Access-Control-Allow-Methods', 'POST') // Adjust allowed methods as needed
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization') // Adjust allowed headers as needed
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.status(204).end() // No content in response to OPTIONS
})
// Log headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL)
  console.log('Response headers:', res.getHeaders())
  next()
})
// app.use(cors());

// create model user on mongo

require('./models/userModel')
require('./models/userInfoModel')
require('./models/productModel')
require('./models/cannabisTransactionModel')
require('./models/creditsTransactionModel')
require('./models/dispenseTransactionModel')
require('./models/closeStocksModel')
require('./models/appSettingsModel')

const fileRoutes = require('./routes/FileHandling')
const userRoutes = require('./routes/UserAuth')
const memberRoutes = require('./routes/MemberData')
const productRoutes = require('./routes/ProductData')
const transactionRoutes = require('./routes/TransactionData')
const stocksRoute = require('./routes/StocksData')
const appSettings = require('./routes/AppSetting')

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
app.use('/', stocksRoute)
app.use('/', appSettings)

// app.use('/', dashboardRoutes)
app.use((req, res) => {
  res.status(404).send('Sorry, the requested page could not be found')
})

// Start the server
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server started on port ${process.env.PORT || 5000}`)
})
