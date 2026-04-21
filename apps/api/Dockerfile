FROM node:20-alpine

# Instalar FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --omit=dev

# Copiar fuentes y compilar
COPY tsconfig.json ./
COPY src ./src
RUN npm install tsx typescript --save-dev && npx tsc

# Directorios de trabajo
RUN mkdir -p uploads results temp

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "dist/server.js"]
