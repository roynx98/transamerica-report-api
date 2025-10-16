FROM node:23.6.1

USER root

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
