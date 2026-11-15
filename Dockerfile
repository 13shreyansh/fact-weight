FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild onnxruntime-node protobufjs
COPY --chown=node:node signal ./signal
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node public ./public
COPY --chown=node:node v2 ./v2
USER node
ENV HOST=0.0.0.0 PORT=4321 NODE_ENV=production SIGNAL_DATA=/data SIGNAL_SCHEDULER=1 CONTEXT_DAILY_CAP=1500
EXPOSE 4321
HEALTHCHECK --start-period=5s --interval=5s --timeout=3s CMD node -e "fetch('http://127.0.0.1:4321/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","signal/server.mjs"]
