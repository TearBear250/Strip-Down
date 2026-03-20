FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies (production). CI/Dev containers can install dev deps as needed.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev --no-audit --prefer-offline

# Bundle app source
COPY . .

EXPOSE 3000
CMD ["node", "src/index.js"]
