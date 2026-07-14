FROM node:20-alpine

RUN apk add --no-cache tini

RUN mkdir -p /home/node/app/logs && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

# install deps first so layer is cached unless package.json changes
COPY --chown=node:node package*.json ./
RUN npm install

# copy source last since it changes most often
COPY --chown=node:node . .

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
