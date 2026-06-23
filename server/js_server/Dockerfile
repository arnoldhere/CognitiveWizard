FROM node:18-alpine
WORKDIR /app
# Copy dependency maps first to leverage Docker layer caching
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]