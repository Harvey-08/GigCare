# apps/worker/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Set API URL environment variable
ENV REACT_APP_API_URL=http://localhost:3011/api

# The app is configured to run on port 3010 via package.json or .env
EXPOSE 3010

CMD ["npm", "start"]
