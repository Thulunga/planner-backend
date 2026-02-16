import dotenv from 'dotenv';
dotenv.config(); // must be FIRST
import { User } from './models/user.model';

import app from './app';
import { connectDB } from './config/db';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, async () => {
    console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
    await connectDB();
    const count = await User.countDocuments();
    // console.log('👤 User count:', count);
});
