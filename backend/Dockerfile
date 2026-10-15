FROM node:24-alpine
WORKDIR /srv/batra
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 MEDIA_DIR=/srv/batra/data/media
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir -p data/media && chown -R node:node data
COPY --chown=node:node src ./src
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node certs ./certs
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
