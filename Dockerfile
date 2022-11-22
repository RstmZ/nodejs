FROM node:14-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . ./

EXPOSE 8080

CMD ["node", "src/app.js"]