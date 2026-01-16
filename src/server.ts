import dotenv from 'dotenv';
dotenv.config(); // must be FIRST
import { User } from './models/user.model';

import app from './app';
import { connectDB } from './config/db';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, '127.0.0.1', async () => {
    console.log(`🚀 Server listening on http://127.0.0.1:${PORT}`);
    await connectDB();
    const count = await User.countDocuments();
    // console.log('👤 User count:', count);
});
