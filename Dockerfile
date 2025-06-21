# Use an official Node.js runtime as a parent image.
# Using alpine for a smaller image size.
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install app dependencies
# Using --only=production could be an option, but devDeps might be needed for 'next build'
RUN npm install

# Bundle the rest of the app's source code
COPY . .

# Build the Next.js app for production
RUN npm run build

# Make port 9002 available to the world outside this container
EXPOSE 9002

# Define the command to run the app
# This will execute "npm start" when the container launches
CMD ["npm", "start"]
