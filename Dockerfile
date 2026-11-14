FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json server.mjs engine.mjs retrieval.mjs ./
COPY --chown=node:node public ./public
COPY --chown=node:node eval/summary.json ./eval/summary.json
USER node
ENV HOST=0.0.0.0 PORT=4320
EXPOSE 4320
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:4320/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
