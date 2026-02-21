import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"

import connectdb from "./config/db.js"
import seedAdmin from "./scripts/adminSeeding.js"

import registerRoutes from "./routes/registerRoutes.js"
import loginRoutes from "./routes/loginRoutes.js"
import adminLoginRoutes from "./routes/adminLoginRoute.js"
import editParticipantProfileRoutes from "./routes/editParticipantProfileRoutes.js"
import participantDashboardRoutes from "./routes/participantDashboardRoutes.js"
import organizerEventsRoutes from "./routes/organizerEventsRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import browseEventsRoutes from "./routes/browseEventsRoutes.js"
import participantEventRoutes from "./routes/participantEventRoutes.js"
import participantOrganizerRoutes from "./routes/participantOrganizerRoutes.js"

import { protect, authorizeRoles } from "./middleware/authMiddleware.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT

// Must specify exact origin (not '*') when credentials: true
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.use('/register', registerRoutes)
app.use('/login', loginRoutes)
app.use('/admin-login', adminLoginRoutes)

// Clear the auth cookie on logout
app.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })
    res.status(200).json({ message: 'Logged out successfully' })
})

app.use('/editParticipantProfile', protect, authorizeRoles('Participant'), editParticipantProfileRoutes)
app.use('/participantDashboard', protect, authorizeRoles('Participant'), participantDashboardRoutes)
app.use('/organizerEvents', protect, authorizeRoles('Organizer'), organizerEventsRoutes)
app.use('/admin', protect, authorizeRoles('Admin'), adminRoutes)
app.use('/browseEvents', protect, authorizeRoles('Participant'), browseEventsRoutes)
app.use('/participantEvents', protect, authorizeRoles('Participant'), participantEventRoutes)
app.use('/participantOrganizers', protect, authorizeRoles('Participant'), participantOrganizerRoutes)

connectdb().then( () => {
    seedAdmin()

    app.listen(PORT, () => {
        console.log(`App started on port: ${PORT}`)
    })
    
}).catch(err => {
    console.error('Failed to connect to db:', err.message);
    process.exit(1);
})

