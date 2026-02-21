import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { validationResult } from "express-validator"

export async function login(req, res) {
    try {
        const error = validationResult(req)
        if(!error.isEmpty()) return res.status(400).json( {error: error.array() });
    

        const {
            email,
            password
        } = req.body

        const user = await User.findOne({email})
        if(!user) return res.status(401).json({error: "Invalid email or password"})

        const checkPasswd = await user.comparePassword(password)
        if(!checkPasswd) return res.status(401).json({ error: "Invalid email or password" })

        const token = jwt.sign(
            {_id: user._id, role: user.role},
            process.env.JWT_SECRET,
            { expiresIn: '1d'}
        )

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
            maxAge: 24 * 60 * 60 * 1000  // 1 day in ms
        })

        res.status(200).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        })
        
    } catch (error) {
        console.error(error)
        res.status(500).json({message: 'Server error during user login' })

    }
    
}