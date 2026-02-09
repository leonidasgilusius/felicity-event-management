import express from "express"
import dotenv from "dotenv"
import cors from "cors"

import connectdb from "./config/db.js"
import registerRoutes from "./routes/registerRoutes.js"
import loginRoutes from "./routes/loginRoutes.js"
import seedAdmin from "./scripts/adminSeeding.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT

app.use(cors({
    origin: '*',
    credentials: true
}))

app.use(express.json())

app.use('/register', registerRoutes)
app.use('/login', loginRoutes)

connectdb().then( () => {
    seedAdmin()

    app.listen(PORT, () => {
        console.log(`App started on port: ${PORT}`)
    })
    
}).catch(err => {
    console.error('Failed to connect to db:', err.message);
    process.exit(1);
})

