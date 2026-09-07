FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the application
RUN npm run build

# Expose the port (Northflank will use this or you can configure it in the dashboard)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
