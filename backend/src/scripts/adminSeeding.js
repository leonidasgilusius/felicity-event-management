import Admin from "../models/Admin.js"

export default async function seedAdmin() {
    const adminExists = await Admin.findOne()
    if (adminExists) return 

    const password = process.env.ADMIN_PASSWD
    const email = process.env.ADMIN_EMAIL

    Admin.create({
        email,
        password
    })

    console.log("Admin created successfully")
}