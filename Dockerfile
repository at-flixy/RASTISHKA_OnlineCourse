FROM node:24-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# Copy static assets into standalone output
RUN cp -r public .next/standalone/public && \
    cp -r .next/static .next/standalone/.next/static

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY start.sh ./start.sh
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

CMD ["./start.sh"]
