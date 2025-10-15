# Get Your Database URL from Render

## Steps to Get DATABASE_URL

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com/

2. **Find Your PostgreSQL Database**
   - Click on your database (should be named something like `smiling-steps-db`)

3. **Copy the Internal Database URL**
   - Look for "Internal Database URL" or "Connection String"
   - It will look like:
   ```
   postgresql://smiling_steps_db_user:PASSWORD@dpg-xxxxx-a.oregon-postgres.render.com/smiling_steps_db
   ```

4. **Update Your .env File**
   - Open `server/.env`
   - Replace the DATABASE_URL line with your actual connection string:
   ```
   DATABASE_URL="postgresql://smiling_steps_db_user:YOUR_ACTUAL_PASSWORD@dpg-xxxxx.oregon-postgres.render.com/smiling_steps_db"
   ```

5. **Save and Restart Server**
   ```cmd
   cd server
   npm start
   ```

## Alternative: Use Local PostgreSQL

If you want to develop with a local database:

1. **Install PostgreSQL locally**
   - Download from: https://www.postgresql.org/download/windows/

2. **Create a local database**
   ```sql
   CREATE DATABASE smiling_steps_local;
   ```

3. **Update .env**
   ```
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/smiling_steps_local"
   ```

## For Now: Quick Solution

Since you're just testing, use the production database URL from Render. This way you can:
- Test locally with real data
- See the same data as production
- Verify everything works before deploying

**Just make sure to get the DATABASE_URL from your Render dashboard!**
