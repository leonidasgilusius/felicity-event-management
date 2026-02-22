import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"

import connectdb from "./config/db.js"
import seedAdmin from "./scripts/adminSeeding.js"

import registerRoutes from "./routes/auth/registerRoutes.js"
import loginRoutes from "./routes/auth/loginRoutes.js"

import adminLoginRoutes from "./routes/admin/adminLoginRoute.js"
import adminRoutes from "./routes/admin/adminRoutes.js"

import organizerEventsRoutes from "./routes/organiser/organizerEventsRoutes.js"
import organizerProfileRoutes from "./routes/organiser/organizerProfileRoutes.js"

import editParticipantProfileRoutes from "./routes/participant/editParticipantProfileRoutes.js"
import participantDashboardRoutes from "./routes/participant/dashboardRoutes.js"
import browseEventsRoutes from "./routes/participant/browseEventsRoutes.js"
import participantEventRoutes from "./routes/participant/eventRoutes.js"
import participantOrganizerRoutes from "./routes/participant/organizerRoutes.js"
import forumRoutes from "./routes/forum/forumRoutes.js"

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

app.set('trust proxy', 1);

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
app.use('/organizerProfile', protect, authorizeRoles('Organizer'), organizerProfileRoutes)
app.use('/admin', protect, authorizeRoles('Admin'), adminRoutes)
app.use('/browseEvents', protect, authorizeRoles('Participant'), browseEventsRoutes)
app.use('/participantEvents', protect, authorizeRoles('Participant'), participantEventRoutes)
app.use('/participantOrganizers', protect, authorizeRoles('Participant'), participantOrganizerRoutes)
app.use('/forums', protect, authorizeRoles('Participant', 'Organizer'), forumRoutes)

connectdb().then( () => {
    seedAdmin()

    app.listen(PORT, () => {
        console.log(`App started on port: ${PORT}`)
    })
    
}).catch(err => {
    console.error('Failed to connect to db:', err.message);
    process.exit(1);
})

