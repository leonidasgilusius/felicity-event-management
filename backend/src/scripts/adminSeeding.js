import Admin from "../models/Admin.js"

export default async function seedAdmin() {
    const adminExists = await Admin.findOne()
    if (adminExists) return 

    const password = process.env.ADMIN_PASSWD

    Admin.create({
        password
    })

    console.log("Admin created successfully")
}