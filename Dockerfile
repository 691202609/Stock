FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY --chown=node:node package*.json local-server.cjs ./
COPY --chown=node:node public ./public
COPY --chown=node:node functions ./functions
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "local-server.cjs"]
