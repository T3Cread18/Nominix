# Usar una imagen ligera de Python
FROM python:3.11-slim

# Evitar que Python genere archivos .pyc y activar el buffer para ver los logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2, WeasyPrint y utilidades
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    python3-dev \
    python3-pip \
    python3-cffi \
    python3-brotli \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libjpeg-dev \
    libopenjp2-7-dev \
    libffi-dev \
    gettext \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del proyecto
COPY . /app/

# Exponer el puerto 8000 (puerto interno del contenedor)
EXPOSE 8000

# Hacer el script de entrada ejecutable
RUN chmod +x /app/entrypoint.sh

# El comando de inicio automatizado
ENTRYPOINT ["/app/entrypoint.sh"]
