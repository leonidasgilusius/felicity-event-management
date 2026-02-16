import { validationResult } from "express-validator"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import Participant from "../models/Participant.js"

export async function register(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        }

        const {
            name,
            email,
            password,
            lastName,
            contactNumber,
            isIIIT,
            organisation
        } = req.body

        const userExists = await User.findOne({email})
        if (userExists) return res.status(400).json({ message: 'User already exists' })

        const iiitDomain = 'iiit.ac.in'
        const isEmailIIIT = email.endsWith(iiitDomain);

        if (isIIIT && !isEmailIIIT) {
            return res.status(400).json({ message: 'IIIT students must use their institute email.' });
        }

        const participant = await Participant.create({
            name,
            lastName,
            email,
            password,
            contactNumber,
            isIIIT,
            organisation: isIIIT ? 'IIIT Hyderabad' : organisation,
        })

        const token = jwt.sign(
            { _id: participant._id, role: 'participant' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            _id: participant._id,
            firstName: participant.firstName,
            email: participant.email,
            role: 'participant',
            token
        });

        
    } catch (error) {
        console.error(error)
        res.status(500).json({message: 'Server error during registering user' })
    }
}
