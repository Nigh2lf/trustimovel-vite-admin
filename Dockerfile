# syntax=docker/dockerfile:1

# Base: dependências instaladas. Compartilhada pelos estágios abaixo.
FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# dev: servidor do Vite com hot reload. É o estágio que o docker-compose da raiz usa
# (build.target: dev). Não publique este estágio: o dev server recusa hosts que não
# conhece (server.allowedHosts) e expõe o código-fonte.
FROM base AS dev
COPY . .
EXPOSE 8081
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# build: gera o bundle estático. As variáveis VITE_* são embutidas no bundle em tempo
# de build, então precisam chegar aqui como build args. O Railway repassa as variáveis
# do serviço como build args automaticamente; em outro lugar use --build-arg.
FROM base AS build
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
COPY . .
RUN npm run build

# prod (estágio final, o que o Railway constrói): só o bundle + um servidor estático.
# `serve -s` devolve o index.html para qualquer rota, que é o que o react-router precisa.
# Escuta na porta que a plataforma informar em PORT (o Railway define essa variável).
FROM node:20-slim AS prod
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
ENV PORT=8081
EXPOSE 8081
CMD ["sh", "-c", "serve -s dist -n -l tcp://0.0.0.0:${PORT}"]
