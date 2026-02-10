import mongoose from "mongoose";

const connectDB = async () => {
    try {
        // MONGO_URI 已经包含数据库名时不要再拼接，否则会变成 xxx/hotel-booking/hotel-booking
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.name} on ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;