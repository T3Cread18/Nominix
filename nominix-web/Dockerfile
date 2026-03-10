# Etapa 1: Construcción (Build)
FROM node:20-slim AS build

WORKDIR /app

# ARG para sobreescribir VITE_API_URL en build local (default: proxy nginx)
# En producción (Vercel), .env.production usa https://api.nominix.net
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código y construir
COPY . .
RUN npm run build

# Etapa 2: Servidor de Producción (Nginx)
FROM nginx:alpine

# Copiar los archivos construidos desde la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]