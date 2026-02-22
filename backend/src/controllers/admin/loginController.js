import jwt from "jsonwebtoken"
import Admin from "../../models/Admin.js"
import { validationResult } from "express-validator"

export default async function adminLogin(req, res) {
    try {
        const error = validationResult(req)
        if (!error.isEmpty()) return res.status(400).json( {error: error.array() });

        const {
            email,
            password
        } = req.body

        // console.log('1')

        const admin = await Admin.findOne({email})
        if(!admin) return res.status(401).json({error: "Invalid email or password"})
        
        // console.log('1')

        const check_password = await admin.comparePassword(password)
        if (!check_password) return res.status(401).json({error: "Invalid email or password"})

        const token = jwt.sign(
            {_id: admin.id, role: "Admin"},
            process.env.JWT_SECRET,
            { expiresIn: '1d'}
        )

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production'? 'None': 'strict',
            maxAge: 24 * 60 * 60 * 1000  // 1 day in ms
        })

        res.status(200).json({
            _id: admin.id,
            role: "Admin"
        })
        
    } catch (error) {
        console.error(error)
        res.status(500).json({message: 'Server error during admin login' })
    }
}