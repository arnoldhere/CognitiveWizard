# Stage 1: Build the static assets
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_BACKEND_BASE_URL=http://localhost:3000
ENV VITE_BACKEND_BASE_URL=${VITE_BACKEND_BASE_URL}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the optimized assets
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
