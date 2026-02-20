#!/bin/bash

# Esperar a que la base de datos esté lista
echo "Esperando a que la base de datos (PostgreSQL) esté lista..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Base de datos disponible."

# Ejecutar migraciones del esquema público (shared)
echo "Ejecutando migraciones de esquemas compartidos..."
python manage.py migrate_schemas --shared --noinput

# Recolectar estáticos
echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

# Inicializar superusuario y tenant público
echo "Ejecutando script de inicialización maestra..."
python scripts/init_superadmin.py

# Iniciar Gunicorn
echo "Iniciando servidor Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --timeout 300 rrhh_saas.wsgi:application
