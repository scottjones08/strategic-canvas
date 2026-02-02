FROM node:20-bullseye-slim

WORKDIR /app

COPY package.json package.json
RUN npm install --omit=dev && npx playwright install --with-deps chromium

COPY src src

ENV PORT=8787
EXPOSE 8787

CMD ["npm", "start"]
