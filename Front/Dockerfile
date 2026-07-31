# Panel HelitebAI — build estático servido por nginx.
#
# El panel habla con el API .NET DESDE EL NAVEGADOR (no server-side como el BFF
# que reemplazó), así que PUBLIC_API_URL debe ser una URL alcanzable por el
# navegador del usuario (el puerto publicado del host, ej. http://localhost:5090),
# nunca el nombre interno de red de Docker (heliteb-api:8080) — Astro incrusta
# esta variable en el JavaScript del cliente durante `astro build`, no en runtime.
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG PUBLIC_API_URL=http://localhost:5090
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 4321
