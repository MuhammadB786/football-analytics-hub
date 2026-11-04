FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node LaLiga_Matches.csv ./
RUN mkdir data reports && chown node:node data reports
USER node
RUN node src/evaluate.js
ENV HOST=0.0.0.0 PORT=3000 DB_PATH=/app/data/football.sqlite
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
