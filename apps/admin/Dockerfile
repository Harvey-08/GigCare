# apps/admin/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Set API URL
ENV REACT_APP_API_URL=http://localhost:3011/api

# Admin app runs on port 3013
EXPOSE 3013

CMD ["npm", "start"]
