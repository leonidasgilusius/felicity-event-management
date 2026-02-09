import User from "../models/User.js"

export default async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL
    
    const adminExists = await User.findOne({ email, name: "Admin" })
    if (adminExists) return 

    const password = process.env.ADMIN_PASSWD

    User.create({
        name: "Admin",
        email,
        password
    })

    console.log("Admin created successfully")
}